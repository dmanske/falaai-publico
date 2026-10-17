import type { Atalho } from "../atalhos";

export const CANAIS_ATALHOS = {
  /** Grava o próximo atalho apertado (feito pelo auxiliar nativo: enxerga Fn e toque duplo). */
  CAPTURAR: "atalhos:capturar",
  CANCELAR_CAPTURA: "atalhos:cancelar-captura",
} as const;

export type ResultadoCaptura = { ok: true; teclas: Atalho } | { ok: false; erro: string };

export interface PonteAtalhos {
  /** Espera o usuário apertar o atalho (até ~10 s). Esc cancela. */
  capturar(): Promise<ResultadoCaptura>;
  cancelarCaptura(): Promise<void>;
}
