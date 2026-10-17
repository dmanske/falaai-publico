import type { FormatoAudio } from "./preferencias";

export const CANAIS_IA = {
  TESTAR: "ia:testar",
} as const;

export interface ResultadoEtapa {
  ok: boolean;
  /** Mensagem em português para mostrar na tela. */
  mensagem: string;
  ms: number;
  /** Texto devolvido pela IA (transcrição, no teste de áudio). */
  resposta?: string;
}

export interface ResultadoTesteIa {
  texto: ResultadoEtapa;
  /** null quando o teste de texto falhou e o de áudio nem foi tentado. */
  audio: (ResultadoEtapa & { formato: FormatoAudio | null }) | null;
}

export interface PonteIa {
  testar(): Promise<ResultadoTesteIa>;
}
