import type { FormatoAudio } from "./preferencias";

export const CANAIS_IA = {
  TESTAR: "ia:testar",
  /** Lista pública de modelos do OpenRouter (sem chave), como ele classifica. */
  MODELOS_OPENROUTER: "ia:modelos-openrouter",
} as const;

/** Um modelo da lista do OpenRouter (GET https://openrouter.ai/api/v1/models). */
export interface ModeloOpenRouter {
  id: string;
  /** Nome como o OpenRouter mostra, sem o fabricante ("Gemini 3.8 Flash"). */
  nome: string;
  /** Fabricante, do prefixo do id/nome ("Google", "OpenAI"…). */
  fabricante: string;
  /** architecture.input_modalities contém "audio". */
  ouveAudio: boolean;
  /** US$ por 1 milhão de tokens de entrada (pricing.prompt × 1e6); null = não informado. */
  precoEntrada: number | null;
  /** US$ por 1 milhão de tokens de saída. */
  precoSaida: number | null;
  /** US$ por 1 milhão de tokens de áudio (pricing.audio × 1e6), quando informado. */
  precoAudio: number | null;
  gratis: boolean;
  contexto: number | null;
}

export interface ListaOpenRouter {
  modelos: ModeloOpenRouter[];
  /** ISO de quando a lista foi buscada (fica em cache por 24 h). */
  atualizadoEm: string;
  erro: string | null;
}

export interface ResultadoEtapa {
  ok: boolean;
  /** Mensagem em português para mostrar na tela. */
  mensagem: string;
  ms: number;
  /** Texto devolvido pela IA (transcrição, no teste de áudio). */
  resposta?: string;
}

export interface ResultadoTesteIa {
  /** Chave e modelo do provedor respondem (pedido de texto simples). */
  texto: ResultadoEtapa;
  /** Só quando o modelo não ouve áudio: o serviço de transcrição transcreveu a amostra. null = não se aplica/não tentado. */
  transcricao: ResultadoEtapa | null;
  /** Caminho completo do ditado com a amostra (resposta = texto final). null = não tentado. */
  audio: (ResultadoEtapa & { formato: FormatoAudio | null }) | null;
}

export interface PonteIa {
  testar(): Promise<ResultadoTesteIa>;
  /** `todos`: inclui os modelos só de texto (precisam de transcrição). `recarregar`: ignora o cache. */
  modelosOpenRouter(opcoes?: { todos?: boolean; recarregar?: boolean }): Promise<ListaOpenRouter>;
}
