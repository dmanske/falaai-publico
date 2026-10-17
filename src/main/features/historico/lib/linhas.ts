// Tradução entre a linha do SQLite (snake_case) e o ItemHistorico da tela.
import type { ItemHistorico, ModoDitado } from "@shared/ipc";

export interface LinhaHistorico {
  id: string;
  criado_em: string;
  modo: string;
  texto: string;
  texto_selecionado: string | null;
  duracao_ms: number;
  palavras: number;
  app: string | null;
  app_id: string | null;
  url: string | null;
  status: string;
  erro: string | null;
  audio_arquivo: string | null;
}

export function linhaParaItem(l: LinhaHistorico): ItemHistorico {
  return {
    id: l.id,
    criadoEm: l.criado_em,
    modo: l.modo as ModoDitado,
    texto: l.texto,
    textoSelecionado: l.texto_selecionado,
    duracaoMs: l.duracao_ms,
    palavras: l.palavras,
    app: l.app,
    appId: l.app_id,
    url: l.url,
    status: l.status === "erro" ? "erro" : "ok",
    erro: l.erro,
    temAudio: !!l.audio_arquivo,
  };
}
