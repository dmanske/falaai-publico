import { ipcMain } from "electron";
import { CANAIS_HISTORICO, type FiltroHistorico, type ItemHistorico } from "@shared/ipc";
import { banco } from "../../lib/banco";
import { ajustarReprocessamento } from "../estatisticas/lib/totais";
import { transcreverERefinar } from "../ia/transcrever";
import { avisarMudanca } from "./index";
import { apagarAudio, lerAudio } from "./lib/audios";
import { contarPalavras } from "./lib/contarPalavras";
import { linhaParaItem, type LinhaHistorico } from "./lib/linhas";

const LIMITE_PADRAO = 50;
const LIMITE_MAXIMO = 200;

function buscarLinha(id: string): LinhaHistorico | undefined {
  return banco().prepare("SELECT * FROM historico WHERE id = ?").get(id) as LinhaHistorico | undefined;
}

function listar(filtro: FiltroHistorico = {}): ItemHistorico[] {
  const onde: string[] = [];
  const params: string[] = [];
  const busca = filtro.busca?.trim();
  if (busca) {
    // Escapa % e _ para a busca ser literal.
    const padrao = `%${busca.replace(/[\\%_]/g, "\\$&")}%`;
    onde.push("(texto LIKE ? ESCAPE '\\' OR app LIKE ? ESCAPE '\\')");
    params.push(padrao, padrao);
  }
  if (filtro.antesDe) {
    onde.push("criado_em < ?");
    params.push(filtro.antesDe);
  }
  const limite = Math.min(Math.max(Math.floor(filtro.limite ?? LIMITE_PADRAO), 1), LIMITE_MAXIMO);
  const sql = `SELECT * FROM historico ${onde.length ? `WHERE ${onde.join(" AND ")}` : ""} ORDER BY criado_em DESC LIMIT ${limite}`;
  return (banco().prepare(sql).all(...params) as unknown as LinhaHistorico[]).map(linhaParaItem);
}

function apagar(id: string): void {
  const linha = buscarLinha(id);
  banco().prepare("DELETE FROM historico WHERE id = ?").run(id);
  apagarAudio(linha?.audio_arquivo ?? null);
}

function apagarTudo(): void {
  const arquivos = banco().prepare("SELECT audio_arquivo FROM historico WHERE audio_arquivo IS NOT NULL").all() as {
    audio_arquivo: string;
  }[];
  banco().exec("DELETE FROM historico");
  for (const a of arquivos) apagarAudio(a.audio_arquivo);
}

async function reprocessar(id: string): Promise<ItemHistorico> {
  const linha = buscarLinha(id);
  if (!linha) throw new Error("Esse ditado não existe mais.");
  const wav = linha.audio_arquivo ? lerAudio(linha.audio_arquivo) : null;
  if (!wav) throw new Error("Este ditado não tem áudio guardado, então não dá para reprocessar.");
  const r = await transcreverERefinar(wav);
  // Falha da IA: não mexe no registro (para não estragar um texto que já estava bom).
  if (!r.ok) throw new Error(r.erro);
  const palavras = contarPalavras(r.texto);
  banco().prepare("UPDATE historico SET texto = ?, palavras = ?, status = 'ok', erro = NULL WHERE id = ?").run(r.texto, palavras, id);
  // Ajusta a diferença de palavras nos totais permanentes (falha não impede o reprocessamento).
  try {
    ajustarReprocessamento(
      banco(),
      { criadoEm: linha.criado_em, modo: linha.modo, palavras: linha.palavras, duracaoMs: linha.duracao_ms, app: linha.app, status: linha.status },
      palavras,
    );
  } catch (e) {
    console.error("[estatisticas] falha ao ajustar os totais no reprocessamento", e);
  }
  const item = linhaParaItem({ ...linha, texto: r.texto, palavras, status: "ok", erro: null });
  avisarMudanca(item);
  return item;
}

function audio(id: string): ArrayBuffer | null {
  const linha = buscarLinha(id);
  const wav = linha?.audio_arquivo ? lerAudio(linha.audio_arquivo) : null;
  if (!wav) return null;
  return wav.buffer.slice(wav.byteOffset, wav.byteOffset + wav.byteLength) as ArrayBuffer;
}

export function registrarIpcHistorico(): void {
  ipcMain.handle(CANAIS_HISTORICO.LISTAR, (_e, filtro: FiltroHistorico) => listar(filtro));
  ipcMain.handle(CANAIS_HISTORICO.APAGAR, (_e, id: string) => apagar(String(id)));
  ipcMain.handle(CANAIS_HISTORICO.APAGAR_TUDO, () => apagarTudo());
  ipcMain.handle(CANAIS_HISTORICO.REPROCESSAR, (_e, id: string) => reprocessar(String(id)));
  ipcMain.handle(CANAIS_HISTORICO.AUDIO, (_e, id: string) => audio(String(id)));
}
