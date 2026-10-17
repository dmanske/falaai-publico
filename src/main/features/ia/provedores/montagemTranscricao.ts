// Montagem dos pedidos de transcrição (URL, cabeçalhos e corpo) e leitura da resposta.
// Funções puras, sem rede: testadas em montagemTranscricao.test.ts.
import { PROVEDORES, type IdTranscricao } from "../../../../shared/provedores.ts";
import { nomeIdioma } from "../prompts.ts";

export interface OpcoesMontagem {
  chave: string;
  /** Modelo do serviço (do catálogo ou digitado). */
  modelo: string;
  /** Idiomas que a pessoa fala (BCP-47). Vazio = deixar o serviço detectar. */
  idiomas: string[];
  /** Dicionário da pessoa: ajuda nomes próprios e termos técnicos. */
  termos: string[];
}

export interface PedidoHttpTranscricao {
  url: string;
  headers: Record<string, string>;
  /** FormData (multipart) ou os bytes do WAV (Deepgram). */
  corpo: FormData | Uint8Array;
}

// ── Limites por serviço (ajustáveis aqui) ────────────────────────────────────
/** `prompt` do OpenAI/Groq: o Whisper aceita ~224 tokens; 800 caracteres cabem com folga. */
export const MAX_CARACTERES_PROMPT = 800;
/** ElevenLabs: até 100 termos (acima disso há cobrança mínima de 20 s), cada < 50 caracteres e ≤ 5 palavras. */
export const MAX_KEYTERMS_ELEVENLABS = 100;
/** Deepgram: limite de 500 tokens por requisição; 100 termos curtos ficam abaixo. */
export const MAX_KEYTERMS_DEEPGRAM = 100;
/** Mistral: `context_bias` aceita até 100 termos. */
export const MAX_CONTEXT_BIAS_MISTRAL = 100;
const MAX_CARACTERES_TERMO = 49;
const MAX_PALAVRAS_TERMO = 5;

const URLS: Record<IdTranscricao, string> = {
  openai: `${PROVEDORES.openai.baseUrl}/audio/transcriptions`,
  groq: `${PROVEDORES.groq.baseUrl}/audio/transcriptions`,
  elevenlabs: "https://api.elevenlabs.io/v1/speech-to-text",
  deepgram: "https://api.deepgram.com/v1/listen",
  mistral: `${PROVEDORES.mistral.baseUrl}/audio/transcriptions`,
};

/** "pt-BR" → "pt" (ISO-639-1). */
export const idiomaIso = (codigo: string): string => codigo.split("-")[0].toLowerCase();

/** Idioma único para forçar, só quando a pessoa fala UM idioma (com mais de um, o serviço detecta). */
function idiomaUnico(idiomas: string[]): string | null {
  return idiomas.length === 1 ? idiomaIso(idiomas[0]) : null;
}

/** Tira termos vazios/duplicados e os que o serviço recusaria (muito longos, palavras demais). */
export function termosValidos(termos: string[], max: number): string[] {
  const vistos = new Set<string>();
  const saida: string[] = [];
  for (const bruto of termos) {
    const t = bruto.trim().replace(/\s+/g, " ");
    if (!t || t.length > MAX_CARACTERES_TERMO || t.split(" ").length > MAX_PALAVRAS_TERMO) continue;
    const k = t.toLowerCase();
    if (vistos.has(k)) continue;
    vistos.add(k);
    saida.push(t);
    if (saida.length >= max) break;
  }
  return saida;
}

/** Prompt de contexto do Whisper/OpenAI/Groq: idiomas + termos, cortado em termo inteiro. */
export function montarPromptTranscricao(idiomas: string[], termos: string[]): string {
  const partes: string[] = [];
  if (idiomas.length) partes.push(`Ditado em ${idiomas.map(nomeIdioma).join(" e ")}.`);
  const base = partes.join(" ");
  const usados: string[] = [];
  let atual = base;
  for (const t of termosValidos(termos, 200)) {
    const candidato = `${base}${base ? " " : ""}Termos: ${[...usados, t].join(", ")}.`;
    if (candidato.length > MAX_CARACTERES_PROMPT) break;
    usados.push(t);
    atual = candidato;
  }
  return atual;
}

function arquivoWav(wav: Uint8Array): Blob {
  return new Blob([wav as Uint8Array<ArrayBuffer>], { type: "audio/wav" });
}

export function montarPedidoTranscricao(servico: IdTranscricao, wav: Uint8Array, o: OpcoesMontagem): PedidoHttpTranscricao {
  const url = URLS[servico];

  if (servico === "deepgram") {
    const q = new URLSearchParams({ model: o.modelo, smart_format: "true" });
    // pt-BR só quando o português é o ÚNICO idioma; com mais de um (ou nenhum), detecção multilíngue.
    q.set("language", o.idiomas.length === 1 && idiomaIso(o.idiomas[0]) === "pt" ? "pt-BR" : "multi");
    for (const t of termosValidos(o.termos, MAX_KEYTERMS_DEEPGRAM)) q.append("keyterm", t);
    return {
      url: `${url}?${q.toString()}`,
      headers: { Authorization: `Token ${o.chave}`, "Content-Type": "audio/wav" },
      corpo: wav,
    };
  }

  const fd = new FormData();
  if (servico === "elevenlabs") {
    fd.append("model_id", o.modelo);
    const lang = idiomaUnico(o.idiomas);
    if (lang) fd.append("language_code", lang);
    for (const t of termosValidos(o.termos, MAX_KEYTERMS_ELEVENLABS)) fd.append("keyterms", t);
    fd.append("file", arquivoWav(wav), "ditado.wav");
    return { url, headers: { "xi-api-key": o.chave }, corpo: fd };
  }

  fd.append("model", o.modelo);
  if (servico === "mistral") {
    const lang = idiomaUnico(o.idiomas);
    if (lang) fd.append("language", lang);
    // Formato de array no multipart (campo repetido) ainda não confirmado com chave real.
    for (const t of termosValidos(o.termos, MAX_CONTEXT_BIAS_MISTRAL)) fd.append("context_bias", t);
  } else if (servico === "groq") {
    // Groq: language (ISO-639-1) melhora precisão e latência; usa o 1º idioma da pessoa.
    if (o.idiomas.length) fd.append("language", idiomaIso(o.idiomas[0]));
    const prompt = montarPromptTranscricao(o.idiomas, o.termos);
    if (prompt) fd.append("prompt", prompt);
  } else {
    // OpenAI: `prompt` com os termos. `keywords`/`languages` do gpt-transcribe não têm formato
    // confirmado, então não são enviados. `language` (singular) só vale para o whisper-1.
    if (o.modelo === "whisper-1") {
      const lang = idiomaUnico(o.idiomas);
      if (lang) fd.append("language", lang);
    }
    const prompt = montarPromptTranscricao(o.idiomas, o.termos);
    if (prompt) fd.append("prompt", prompt);
  }
  fd.append("file", arquivoWav(wav), "ditado.wav");
  return { url, headers: { Authorization: `Bearer ${o.chave}` }, corpo: fd };
}

/** Texto da resposta de cada serviço. */
export function lerTextoTranscricao(servico: IdTranscricao, json: unknown): string {
  if (servico === "deepgram") {
    const t = (json as { results?: { channels?: { alternatives?: { transcript?: unknown }[] }[] } })?.results?.channels?.[0]
      ?.alternatives?.[0]?.transcript;
    return typeof t === "string" ? t.trim() : "";
  }
  const t = (json as { text?: unknown })?.text;
  return typeof t === "string" ? t.trim() : "";
}
