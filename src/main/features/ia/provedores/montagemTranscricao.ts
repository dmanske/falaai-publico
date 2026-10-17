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
  /** true = não pede marcação de tempo/parágrafos (usado na nova tentativa quando o serviço recusa). */
  semMarcas?: boolean;
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
/** Pausa (s) entre palavras do ElevenLabs a partir da qual a transcrição ganha uma quebra de linha. */
export const PAUSA_QUEBRA_S = 1.2;
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
    // paragraphs=true (documentado em developers.deepgram.com/docs/paragraphs) devolve a divisão em
    // parágrafos; fora do "multi" porque a doc não confirma a combinação com detecção multilíngue.
    if (!o.semMarcas && q.get("language") !== "multi") q.set("paragraphs", "true");
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
    // Segmentos com start/end (console.groq.com/docs/speech-to-text) para quebrar linha nas pausas.
    if (!o.semMarcas) {
      fd.append("response_format", "verbose_json");
      fd.append("timestamp_granularities[]", "segment");
    }
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

// ── Quebras de linha nas pausas (caminho de 2 chamadas) ──────────────────────
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Junta pedaços de texto com "\n" onde `quebra[i]` é true (entre o pedaço i-1 e o i). */
function juntarComQuebras(pedacos: string[], quebra: boolean[]): string {
  let saida = "";
  pedacos.forEach((p, i) => {
    const t = p.trim();
    if (!t) return;
    saida += saida ? (quebra[i] ? "\n" : " ") + t : t;
  });
  return saida;
}

/**
 * Texto da transcrição já com "\n" onde o serviço deu a marcação (Groq: segmentos com pausa ≥ 1,2 s;
 * Deepgram: parágrafos; ElevenLabs: palavras com pausa ≥ 1,2 s). Se o campo não vier, cai no texto simples.
 */
export function lerTranscricaoComQuebras(servico: IdTranscricao, json: unknown): string {
  const simples = lerTextoTranscricao(servico, json);
  try {
    if (servico === "groq") {
      const seg = (json as { segments?: unknown })?.segments;
      if (!Array.isArray(seg) || seg.length < 2) return simples;
      const textos: string[] = [];
      const quebra: boolean[] = [];
      let fimAnterior: number | null = null;
      for (const s of seg as { text?: unknown; start?: unknown; end?: unknown }[]) {
        if (typeof s?.text !== "string") return simples;
        const ini = num(s.start);
        quebra.push(ini !== null && fimAnterior !== null && ini - fimAnterior >= PAUSA_QUEBRA_S);
        textos.push(s.text);
        fimAnterior = num(s.end);
      }
      const t = juntarComQuebras(textos, quebra);
      return t || simples;
    }
    if (servico === "deepgram") {
      const alt = (json as { results?: { channels?: { alternatives?: { paragraphs?: { paragraphs?: unknown } }[] }[] } })?.results
        ?.channels?.[0]?.alternatives?.[0];
      const pars = alt?.paragraphs?.paragraphs;
      if (!Array.isArray(pars) || pars.length < 2) return simples;
      const textos = (pars as { sentences?: { text?: unknown }[] }[]).map((p) =>
        (p?.sentences ?? []).map((f) => (typeof f?.text === "string" ? f.text.trim() : "")).filter(Boolean).join(" "),
      );
      const t = juntarComQuebras(textos, textos.map(() => true));
      return t || simples;
    }
    if (servico === "elevenlabs") {
      const palavras = (json as { words?: unknown })?.words;
      if (!Array.isArray(palavras)) return simples;
      let saida = "";
      let fimAnterior: number | null = null;
      let quebrou = false;
      for (const w of palavras as { text?: unknown; type?: unknown; start?: unknown; end?: unknown }[]) {
        if (typeof w?.text !== "string" || w.type === "audio_event") continue;
        if (w.type === "word") {
          const ini = num(w.start);
          if (ini !== null && fimAnterior !== null && saida && ini - fimAnterior >= PAUSA_QUEBRA_S) {
            saida = saida.trimEnd() + "\n";
            quebrou = true;
          }
          const fim = num(w.end);
          if (fim !== null) fimAnterior = fim;
        }
        saida += w.text;
      }
      // Só troca o texto simples quando de fato houve quebra (evita divergência à toa).
      return quebrou && saida.trim() ? saida.replace(/[ \t]+\n/g, "\n").trim() : simples;
    }
  } catch {
    // formato inesperado: cai no texto simples
  }
  return simples;
}
