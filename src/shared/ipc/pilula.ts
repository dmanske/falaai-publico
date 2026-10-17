export const CANAIS_PILULA = {
  /** main → pílula: o que fazer com o microfone. */
  COMANDO: "pilula:comando",
  /** main → pílula: o que mostrar. */
  ESTADO: "pilula:estado",
  /** pílula → main: gravação terminada (WAV) ou falha. */
  AUDIO: "pilula:audio",
  /** pílula → main: clique no ✓ (terminar e colar) ou no ✕ (cancelar). */
  ACAO: "pilula:acao",
} as const;

export type ModoDitado = "ditado" | "pergunte" | "traducao";

export type ComandoPilula =
  | { acao: "iniciar"; sessao: number; sons: boolean; microfoneId: string | null }
  | { acao: "parar"; sessao: number; sons: boolean }
  | { acao: "cancelar"; sessao: number; sons: boolean };

export type EstadoPilula =
  | { estado: "oculta" }
  | { estado: "gravando"; modo: ModoDitado; maosLivres: boolean }
  | { estado: "processando"; modo: ModoDitado }
  | { estado: "erro"; mensagem: string }
  /** Aviso curto e neutro (ex.: "Palavra adicionada ao dicionário: Lovable"). */
  | { estado: "aviso"; mensagem: string };

export type AudioPilula =
  | { sessao: number; ok: true; wav: ArrayBuffer; duracaoMs: number }
  | { sessao: number; ok: false; erro: string };

/** Usado só pela janela da pílula. Os "ao…" devolvem a função que desliga o ouvinte. */
export interface PontePilula {
  aoComando(cb: (c: ComandoPilula) => void): () => void;
  aoEstado(cb: (e: EstadoPilula) => void): () => void;
  enviarAudio(a: AudioPilula): void;
  acao(acao: "confirmar" | "cancelar"): void;
}
