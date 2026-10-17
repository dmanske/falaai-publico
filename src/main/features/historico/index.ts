// Histórico de ditados: tabela no SQLite, áudios em disco, limpeza por retenção.
import { randomUUID } from "node:crypto";
import { BrowserWindow } from "electron";
import { CANAIS_HISTORICO, type ItemHistorico, type ModoDitado } from "@shared/ipc";
import { banco, migrar } from "../../lib/banco";
import { aoMudarPreferencias, lerPreferencias } from "../preferencias";
import { apagarAudio, gravarAudio } from "./lib/audios";
import { contarPalavras } from "./lib/contarPalavras";
import { linhaParaItem, type LinhaHistorico } from "./lib/linhas";

export interface NovoDitado {
  modo: ModoDitado;
  texto: string;
  textoSelecionado: string | null;
  duracaoMs: number;
  app: string | null;
  appId: string | null;
  url: string | null;
  status: "ok" | "erro";
  erro: string | null;
  /** WAV do ditado; guardado só se preferencias.guardarAudio. */
  wav: Buffer | null;
}

/** De quanto em quanto tempo a limpeza por retenção roda (ms). */
const INTERVALO_LIMPEZA_MS = 6 * 60 * 60 * 1000;

const MIGRACOES = [
  `CREATE TABLE historico (
     id TEXT PRIMARY KEY,
     criado_em TEXT NOT NULL,
     modo TEXT NOT NULL,
     texto TEXT NOT NULL,
     texto_selecionado TEXT,
     duracao_ms INTEGER NOT NULL DEFAULT 0,
     palavras INTEGER NOT NULL DEFAULT 0,
     app TEXT,
     app_id TEXT,
     url TEXT,
     status TEXT NOT NULL,
     erro TEXT,
     audio_arquivo TEXT
   );
   CREATE INDEX idx_historico_criado_em ON historico (criado_em);
   CREATE INDEX idx_historico_app ON historico (app);`,
];

/** Avisa todas as janelas abertas que um item foi criado ou mudou. */
export function avisarMudanca(item: ItemHistorico): void {
  for (const janela of BrowserWindow.getAllWindows()) {
    if (!janela.isDestroyed()) janela.webContents.send(CANAIS_HISTORICO.MUDOU, item);
  }
}

/** Apaga ditados mais velhos que a retenção (e seus áudios). retencaoDias null = nunca apaga. */
export function limparPorRetencao(): void {
  try {
    const dias = lerPreferencias().retencaoDias;
    if (dias === null || dias === undefined || dias <= 0) return;
    const limite = new Date(Date.now() - dias * 86_400_000).toISOString();
    const velhos = banco().prepare("SELECT audio_arquivo FROM historico WHERE criado_em < ?").all(limite) as {
      audio_arquivo: string | null;
    }[];
    banco().prepare("DELETE FROM historico WHERE criado_em < ?").run(limite);
    for (const v of velhos) apagarAudio(v.audio_arquivo);
    if (velhos.length) console.log(`[historico] retenção: ${velhos.length} ditado(s) apagado(s)`);
  } catch (e) {
    console.error("[historico] falha na limpeza por retenção", e);
  }
}

/** Cria as tabelas e agenda a limpeza por retenção. Chamado uma vez no início do app. */
export function iniciarHistorico(): void {
  migrar("historico", MIGRACOES);
  limparPorRetencao();
  setInterval(limparPorRetencao, INTERVALO_LIMPEZA_MS).unref();
  // Se o usuário encurtar a retenção, aplica na hora.
  aoMudarPreferencias((nova, anterior) => {
    if (nova.retencaoDias !== anterior.retencaoDias) limparPorRetencao();
  });
}

/** Grava um ditado e avisa as janelas (CANAIS_HISTORICO.MUDOU). Nunca lança exceção. */
export function registrarDitado(d: NovoDitado): ItemHistorico | null {
  let audio: string | null = null;
  try {
    const id = randomUUID();
    if (d.wav && lerPreferencias().guardarAudio) {
      try {
        audio = gravarAudio(id, d.wav);
      } catch (e) {
        console.error("[historico] não consegui gravar o áudio", e);
      }
    }
    const linha: LinhaHistorico = {
      id,
      criado_em: new Date().toISOString(),
      modo: d.modo,
      texto: d.texto,
      texto_selecionado: d.textoSelecionado,
      duracao_ms: Math.round(d.duracaoMs),
      palavras: contarPalavras(d.texto),
      app: d.app,
      app_id: d.appId,
      url: d.url,
      status: d.status,
      erro: d.erro,
      audio_arquivo: audio,
    };
    banco()
      .prepare(
        `INSERT INTO historico (id, criado_em, modo, texto, texto_selecionado, duracao_ms, palavras, app, app_id, url, status, erro, audio_arquivo)
         VALUES (:id, :criado_em, :modo, :texto, :texto_selecionado, :duracao_ms, :palavras, :app, :app_id, :url, :status, :erro, :audio_arquivo)`,
      )
      .run({ ...linha });
    const item = linhaParaItem(linha);
    avisarMudanca(item);
    return item;
  } catch (e) {
    console.error("[historico] falha ao registrar ditado", e);
    apagarAudio(audio);
    return null;
  }
}
