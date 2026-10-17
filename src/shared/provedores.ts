// Catálogo central dos provedores de IA e dos serviços de transcrição.
// Fonte: docs/integracoes/PROVEDORES_IA.md (pesquisa nas docs oficiais em 17/10/2026).
// IDs de modelo mudam rápido: ajustar AQUI. A tela também aceita um id digitado à mão.
// Sem imports de Node/DOM: usado pelo processo principal e pelas telas.

/** Provedor que limpa/formata o texto (e, se "ouve áudio", também transcreve na mesma chamada). */
export type IdProvedor = "lovable" | "gemini" | "openrouter" | "openai" | "anthropic" | "groq" | "mistral" | "deepseek";

/** Serviço de transcrição (fala → texto bruto), usado quando o provedor não ouve áudio. */
export type IdTranscricao = "openai" | "groq" | "elevenlabs" | "deepgram" | "mistral";

/** Toda chave guardada no cofre: uma por provedor/serviço. */
export type NomeChave = IdProvedor | "elevenlabs" | "deepgram";

export interface ModeloCatalogo {
  id: string;
  nome: string;
  nota: string;
  recomendado?: boolean;
  /** Este modelo recebe áudio direto (1 chamada). Se omitido, vale o `ouveAudio` do provedor. */
  ouveAudio?: boolean;
}

export interface Provedor {
  id: IdProvedor;
  nome: string;
  /** "openai-chat": POST {baseUrl}/chat/completions (Bearer). "anthropic": SDK oficial da Anthropic. */
  formato: "openai-chat" | "anthropic";
  baseUrl: string;
  /** Os modelos deste provedor recebem áudio (1 chamada: transcreve e limpa). */
  ouveAudio: boolean;
  /** Serviço de transcrição do mesmo provedor (mesma chave), sugerido quando ele não ouve áudio. */
  transcricaoPropria: IdTranscricao | null;
  /** Onde a pessoa cria a chave. */
  linkChave: string;
  /** Começo típico da chave, só para orientar ("sk-ant-"…); nunca bloqueia. */
  prefixoChave?: string;
  modelos: ModeloCatalogo[];
  /** Algo ainda não confirmado com chave real (aparece como aviso na tela). */
  aviso?: string;
}

export interface ServicoTranscricao {
  id: IdTranscricao;
  nome: string;
  /** Chave usada: a do provedor de mesmo nome, ou a própria (ElevenLabs/Deepgram). */
  chave: NomeChave;
  linkChave: string;
  modelos: ModeloCatalogo[];
  /** Como o dicionário do usuário é enviado (ajuda nomes próprios). */
  termos: "prompt" | "keyterms" | "keyterm" | "context_bias";
  aviso?: string;
}

export const PROVEDORES: Record<IdProvedor, Provedor> = {
  lovable: {
    id: "lovable",
    nome: "Lovable",
    formato: "openai-chat",
    baseUrl: "https://ai.gateway.lovable.dev/v1",
    ouveAudio: true,
    transcricaoPropria: null,
    linkChave: "https://lovable.dev",
    modelos: [
      { id: "google/gemini-3-flash-preview", nome: "Gemini 3 Flash", nota: "o mais rápido e barato no teste do almoxarifado", recomendado: true },
      { id: "google/gemini-3.8-flash", nome: "Gemini 3.8 Flash", nota: "rápido, um pouco mais lento que o 3 Flash" },
      { id: "google/gemini-3.1-pro-preview", nome: "Gemini 3.1 Pro", nota: "mais caro e mais lento; para textos difíceis" },
    ],
  },
  gemini: {
    id: "gemini",
    nome: "Google Gemini",
    formato: "openai-chat",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    ouveAudio: true,
    transcricaoPropria: null,
    linkChave: "https://aistudio.google.com/apikey",
    prefixoChave: "AIza",
    modelos: [
      { id: "gemini-3.8-flash", nome: "Gemini 3.8 Flash", nota: "o mais novo e estável; melhor qualidade", recomendado: true },
      { id: "gemini-3.5-flash-lite", nome: "Gemini 3.5 Flash-Lite", nota: "mais rápido e barato" },
      { id: "gemini-3-flash-preview", nome: "Gemini 3 Flash (preview)", nota: "o mesmo que a Lovable usa hoje" },
    ],
  },
  openrouter: {
    id: "openrouter",
    nome: "OpenRouter",
    formato: "openai-chat",
    baseUrl: "https://openrouter.ai/api/v1",
    ouveAudio: true,
    transcricaoPropria: null,
    linkChave: "https://openrouter.ai/keys",
    prefixoChave: "sk-or-",
    modelos: [
      { id: "google/gemini-3.8-flash", nome: "Gemini 3.8 Flash", nota: "boa qualidade, ouve áudio", recomendado: true },
      { id: "google/gemini-3.5-flash-lite", nome: "Gemini 3.5 Flash-Lite", nota: "mais barato" },
      { id: "openai/gpt-audio-mini", nome: "GPT Audio Mini", nota: "modelo de áudio da OpenAI" },
    ],
  },
  openai: {
    id: "openai",
    nome: "OpenAI",
    formato: "openai-chat",
    baseUrl: "https://api.openai.com/v1",
    ouveAudio: false,
    transcricaoPropria: "openai",
    linkChave: "https://platform.openai.com/api-keys",
    prefixoChave: "sk-",
    modelos: [
      { id: "gpt-6-luna", nome: "GPT-6 Luna", nota: "o mais rápido e barato", recomendado: true },
      { id: "gpt-6.1-sol", nome: "GPT-6.1 Sol", nota: "meio-termo" },
      { id: "gpt-6-astra", nome: "GPT-6 Astra", nota: "o melhor, mais caro" },
    ],
  },
  anthropic: {
    id: "anthropic",
    nome: "Claude",
    formato: "anthropic",
    baseUrl: "https://api.anthropic.com",
    ouveAudio: false,
    transcricaoPropria: null,
    linkChave: "https://platform.claude.com/settings/keys",
    prefixoChave: "sk-ant-",
    modelos: [
      { id: "claude-opus-5-5", nome: "Claude Opus 5.5", nota: "o mais capaz (padrão recomendado pela Anthropic)", recomendado: true },
      { id: "claude-sonnet-5-5", nome: "Claude Sonnet 5.5", nota: "rápido e capaz" },
      { id: "claude-haiku-5-5", nome: "Claude Haiku 5.5", nota: "o mais rápido e barato" },
    ],
  },
  groq: {
    id: "groq",
    nome: "Groq",
    formato: "openai-chat",
    baseUrl: "https://api.groq.com/openai/v1",
    ouveAudio: false,
    transcricaoPropria: "groq",
    linkChave: "https://console.groq.com/keys",
    prefixoChave: "gsk_",
    modelos: [
      { id: "openai/gpt-oss-20b", nome: "GPT-OSS 20B", nota: "muito rápido e barato", recomendado: true },
      { id: "openai/gpt-oss-120b", nome: "GPT-OSS 120B", nota: "melhor qualidade" },
    ],
  },
  mistral: {
    id: "mistral",
    nome: "Mistral",
    formato: "openai-chat",
    baseUrl: "https://api.mistral.ai/v1",
    ouveAudio: true,
    transcricaoPropria: "mistral",
    linkChave: "https://console.mistral.ai/api-keys",
    modelos: [{ id: "voxtral-small-latest", nome: "Voxtral Small", nota: "ouve áudio direto", recomendado: true }],
    aviso: "Formato do áudio no chat da Mistral ainda não confirmado com chave real — use o botão Testar.",
  },
  deepseek: {
    id: "deepseek",
    nome: "DeepSeek",
    formato: "openai-chat",
    baseUrl: "https://api.deepseek.com",
    ouveAudio: false,
    transcricaoPropria: null,
    linkChave: "https://platform.deepseek.com/api_keys",
    prefixoChave: "sk-",
    modelos: [
      { id: "deepseek-flash", nome: "DeepSeek Flash", nota: "rápido e barato", recomendado: true },
      { id: "deepseek-v4-pro", nome: "DeepSeek V4 Pro", nota: "melhor qualidade" },
    ],
  },
};

export const TRANSCRICOES: Record<IdTranscricao, ServicoTranscricao> = {
  openai: {
    id: "openai",
    nome: "OpenAI",
    chave: "openai",
    linkChave: "https://platform.openai.com/api-keys",
    modelos: [
      { id: "gpt-transcribe", nome: "GPT Transcribe", nota: "recomendado", recomendado: true },
      { id: "gpt-4o-mini-transcribe", nome: "GPT-4o mini Transcribe", nota: "mais barato" },
      { id: "whisper-1", nome: "Whisper", nota: "o clássico" },
    ],
    termos: "prompt",
  },
  groq: {
    id: "groq",
    nome: "Groq (Whisper)",
    chave: "groq",
    linkChave: "https://console.groq.com/keys",
    modelos: [
      { id: "whisper-large-v3-turbo", nome: "Whisper Large v3 Turbo", nota: "muito rápido e barato", recomendado: true },
      { id: "whisper-large-v3", nome: "Whisper Large v3", nota: "mais preciso" },
    ],
    termos: "prompt",
  },
  elevenlabs: {
    id: "elevenlabs",
    nome: "ElevenLabs (Scribe)",
    chave: "elevenlabs",
    linkChave: "https://elevenlabs.io/app/settings/api-keys",
    modelos: [{ id: "scribe_v2", nome: "Scribe v2", nota: "muito preciso", recomendado: true }],
    termos: "keyterms",
    aviso: "Mandar o dicionário à ElevenLabs custa 20% a mais por transcrição.",
  },
  deepgram: {
    id: "deepgram",
    nome: "Deepgram",
    chave: "deepgram",
    linkChave: "https://console.deepgram.com",
    modelos: [{ id: "nova-3", nome: "Nova-3", nota: "rápido", recomendado: true }],
    termos: "keyterm",
  },
  mistral: {
    id: "mistral",
    nome: "Mistral (Voxtral)",
    chave: "mistral",
    linkChave: "https://console.mistral.ai/api-keys",
    modelos: [{ id: "voxtral-mini-latest", nome: "Voxtral Mini Transcribe", nota: "transcrição da Mistral", recomendado: true }],
    termos: "context_bias",
  },
};

export const ORDEM_PROVEDORES: IdProvedor[] = ["lovable", "gemini", "openrouter", "openai", "anthropic", "groq", "mistral", "deepseek"];
export const ORDEM_TRANSCRICOES: IdTranscricao[] = ["openai", "groq", "elevenlabs", "deepgram", "mistral"];

export const modeloPadrao = (p: IdProvedor) => (PROVEDORES[p].modelos.find((m) => m.recomendado) ?? PROVEDORES[p].modelos[0]).id;
export const modeloTranscricaoPadrao = (t: IdTranscricao) =>
  (TRANSCRICOES[t].modelos.find((m) => m.recomendado) ?? TRANSCRICOES[t].modelos[0]).id;

/** O modelo escolhido recebe áudio direto? (Senão, precisa de um serviço de transcrição antes.) */
export function modeloOuveAudio(p: IdProvedor, modelo: string): boolean {
  const m = PROVEDORES[p].modelos.find((x) => x.id === modelo);
  return m?.ouveAudio ?? PROVEDORES[p].ouveAudio;
}

/** Transcrição sugerida quando o provedor não ouve áudio: a do próprio provedor, se houver. */
export const transcricaoSugerida = (p: IdProvedor): IdTranscricao | null => PROVEDORES[p].transcricaoPropria;
