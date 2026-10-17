import type { ModoDitado } from "./pilula";

export const CANAIS_HISTORICO = {
  LISTAR: "historico:listar",
  APAGAR: "historico:apagar",
  APAGAR_TUDO: "historico:apagar-tudo",
  REPROCESSAR: "historico:reprocessar",
  AUDIO: "historico:audio",
  /** main → janelas: um item foi criado ou mudou (envia o item). */
  MUDOU: "historico:mudou",
} as const;

export interface ItemHistorico {
  id: string;
  /** ISO 8601. */
  criadoEm: string;
  modo: ModoDitado;
  /** Texto final colado (ou a resposta, no modo pergunte). */
  texto: string;
  /** Modo pergunte: o texto que estava selecionado quando o comando foi dado. */
  textoSelecionado: string | null;
  duracaoMs: number;
  palavras: number;
  /** App em foco quando o ditado começou. */
  app: string | null;
  appId: string | null;
  url: string | null;
  status: "ok" | "erro";
  erro: string | null;
  temAudio: boolean;
}

export interface FiltroHistorico {
  busca?: string;
  /** Paginação: só itens criados antes deste ISO. */
  antesDe?: string;
  limite?: number;
}

export interface PonteHistorico {
  listar(filtro: FiltroHistorico): Promise<ItemHistorico[]>;
  apagar(id: string): Promise<void>;
  apagarTudo(): Promise<void>;
  /** Manda o áudio guardado de novo para a IA e atualiza o texto. */
  reprocessar(id: string): Promise<ItemHistorico>;
  /** WAV guardado, para ouvir na tela; null se não houver. */
  audio(id: string): Promise<ArrayBuffer | null>;
  aoMudar(cb: (item: ItemHistorico) => void): () => void;
}
