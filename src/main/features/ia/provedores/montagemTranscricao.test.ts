// Rodar: npm test
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  lerTextoTranscricao,
  lerTranscricaoComQuebras,
  MAX_CARACTERES_PROMPT,
  montarPedidoTranscricao,
  montarPromptTranscricao,
  termosValidos,
} from "./montagemTranscricao.ts";

const wav = new Uint8Array([82, 73, 70, 70]);
const base = { chave: "k", idiomas: ["pt-BR"], termos: ["Supabase", "FalaAi"] };
const campos = (fd: FormData, nome: string) => fd.getAll(nome).map(String);

describe("termosValidos", () => {
  it("tira vazios, duplicados, longos demais e com palavras demais", () => {
    const t = termosValidos(["Supabase", " supabase ", "", "a".repeat(60), "um dois três quatro cinco seis", "FalaAi"], 10);
    assert.deepEqual(t, ["Supabase", "FalaAi"]);
  });
  it("respeita o máximo", () => {
    assert.equal(termosValidos(Array.from({ length: 150 }, (_, i) => `t${i}`), 100).length, 100);
  });
});

describe("montarPromptTranscricao", () => {
  it("junta idioma e termos", () => {
    assert.equal(montarPromptTranscricao(["pt-BR"], ["Supabase", "FalaAi"]), "Ditado em português do Brasil. Termos: Supabase, FalaAi.");
    assert.equal(montarPromptTranscricao([], []), "");
  });
  it("corta em termo inteiro dentro do limite", () => {
    const termos = Array.from({ length: 300 }, (_, i) => `termo${i}`);
    const p = montarPromptTranscricao(["en"], termos);
    assert.ok(p.length <= MAX_CARACTERES_PROMPT);
    assert.match(p, /termo\d+\.$/);
  });
});

describe("montarPedidoTranscricao", () => {
  it("OpenAI: multipart com model, prompt e file; sem keywords/languages", () => {
    const p = montarPedidoTranscricao("openai", wav, { ...base, modelo: "gpt-transcribe" });
    assert.equal(p.url, "https://api.openai.com/v1/audio/transcriptions");
    assert.equal(p.headers.Authorization, "Bearer k");
    const fd = p.corpo as FormData;
    assert.equal(fd.get("model"), "gpt-transcribe");
    assert.match(String(fd.get("prompt")), /Termos: Supabase, FalaAi/);
    assert.equal(fd.get("keywords"), null);
    assert.equal(fd.get("languages"), null);
    assert.equal(fd.get("language"), null);
    assert.ok(fd.get("file") instanceof Blob);
  });
  it("OpenAI whisper-1: manda language (singular) quando há um idioma só", () => {
    const fd = montarPedidoTranscricao("openai", wav, { ...base, modelo: "whisper-1" }).corpo as FormData;
    assert.equal(fd.get("language"), "pt");
  });
  it("Groq: URL, language do 1º idioma e prompt", () => {
    const p = montarPedidoTranscricao("groq", wav, { ...base, idiomas: ["pt-BR", "en"], modelo: "whisper-large-v3-turbo" });
    assert.equal(p.url, "https://api.groq.com/openai/v1/audio/transcriptions");
    const fd = p.corpo as FormData;
    assert.equal(fd.get("language"), "pt");
    assert.match(String(fd.get("prompt")), /Supabase/);
  });
  it("ElevenLabs: xi-api-key, model_id, keyterms repetidos, language_code só com idioma único", () => {
    const p = montarPedidoTranscricao("elevenlabs", wav, { ...base, modelo: "scribe_v2" });
    assert.equal(p.url, "https://api.elevenlabs.io/v1/speech-to-text");
    assert.equal(p.headers["xi-api-key"], "k");
    const fd = p.corpo as FormData;
    assert.equal(fd.get("model_id"), "scribe_v2");
    assert.deepEqual(campos(fd, "keyterms"), ["Supabase", "FalaAi"]);
    assert.equal(fd.get("language_code"), "pt");
    const misto = montarPedidoTranscricao("elevenlabs", wav, { ...base, idiomas: ["pt-BR", "en"], modelo: "scribe_v2" }).corpo as FormData;
    assert.equal(misto.get("language_code"), null);
  });
  it("Deepgram: bytes no corpo, Token, query com keyterm repetido e idioma", () => {
    const p = montarPedidoTranscricao("deepgram", wav, { ...base, modelo: "nova-3" });
    assert.equal(p.corpo, wav);
    assert.equal(p.headers.Authorization, "Token k");
    assert.equal(p.headers["Content-Type"], "audio/wav");
    const u = new URL(p.url);
    assert.equal(u.origin + u.pathname, "https://api.deepgram.com/v1/listen");
    assert.equal(u.searchParams.get("model"), "nova-3");
    assert.equal(u.searchParams.get("smart_format"), "true");
    assert.equal(u.searchParams.get("language"), "pt-BR");
    assert.deepEqual(u.searchParams.getAll("keyterm"), ["Supabase", "FalaAi"]);
  });
  it("Deepgram: vários idiomas ou nenhum = multi", () => {
    const m = (idiomas: string[]) => new URL(montarPedidoTranscricao("deepgram", wav, { ...base, idiomas, modelo: "nova-3" }).url).searchParams.get("language");
    assert.equal(m(["pt-BR", "en"]), "multi");
    assert.equal(m([]), "multi");
    assert.equal(m(["en"]), "multi");
  });
  it("Mistral: voxtral, language e context_bias", () => {
    const p = montarPedidoTranscricao("mistral", wav, { ...base, modelo: "voxtral-mini-latest" });
    assert.equal(p.url, "https://api.mistral.ai/v1/audio/transcriptions");
    const fd = p.corpo as FormData;
    assert.equal(fd.get("model"), "voxtral-mini-latest");
    assert.equal(fd.get("language"), "pt");
    assert.deepEqual(campos(fd, "context_bias"), ["Supabase", "FalaAi"]);
  });
});

describe("lerTextoTranscricao", () => {
  it("lê o texto de cada serviço", () => {
    assert.equal(lerTextoTranscricao("openai", { text: " olá " }), "olá");
    assert.equal(lerTextoTranscricao("deepgram", { results: { channels: [{ alternatives: [{ transcript: "oi" }] }] } }), "oi");
    assert.equal(lerTextoTranscricao("deepgram", {}), "");
  });
});

describe("marcação de tempo no pedido", () => {
  it("Groq: pede verbose_json com segmentos; semMarcas não pede", () => {
    const fd = montarPedidoTranscricao("groq", wav, { ...base, modelo: "whisper-large-v3-turbo" }).corpo as FormData;
    assert.equal(fd.get("response_format"), "verbose_json");
    assert.deepEqual(campos(fd, "timestamp_granularities[]"), ["segment"]);
    const sem = montarPedidoTranscricao("groq", wav, { ...base, modelo: "whisper-large-v3-turbo", semMarcas: true }).corpo as FormData;
    assert.equal(sem.get("response_format"), null);
    assert.equal(sem.get("timestamp_granularities[]"), null);
  });
  it("OpenAI e ElevenLabs: pedido sem response_format nem timestamps", () => {
    for (const s of ["openai", "elevenlabs"] as const) {
      const fd = montarPedidoTranscricao(s, wav, { ...base, modelo: "x" }).corpo as FormData;
      assert.equal(fd.get("response_format"), null);
      assert.equal(fd.get("timestamp_granularities[]"), null);
      assert.equal(fd.get("timestamps_granularity"), null);
    }
  });
  it("Deepgram: paragraphs=true só com idioma único; semMarcas tira", () => {
    const q = (o: object) => new URL(montarPedidoTranscricao("deepgram", wav, { ...base, modelo: "nova-3", ...o }).url).searchParams;
    assert.equal(q({ idiomas: ["pt-BR"] }).get("paragraphs"), "true");
    assert.equal(q({ idiomas: ["pt-BR", "en"] }).get("paragraphs"), null);
    assert.equal(q({ idiomas: ["pt-BR"], semMarcas: true }).get("paragraphs"), null);
  });
});

describe("lerTranscricaoComQuebras", () => {
  it("Groq: quebra de linha onde a pausa entre segmentos é ≥ 1,2 s", () => {
    const json = {
      text: "a b c",
      segments: [
        { text: " Primeiro item.", start: 0, end: 2 },
        { text: " Segundo item.", start: 2.5, end: 4 },
        { text: " Outro assunto.", start: 5.5, end: 7 },
      ],
    };
    assert.equal(lerTranscricaoComQuebras("groq", json), "Primeiro item. Segundo item.\nOutro assunto.");
  });
  it("Groq: sem segments cai no texto simples", () => {
    assert.equal(lerTranscricaoComQuebras("groq", { text: " oi " }), "oi");
    assert.equal(lerTranscricaoComQuebras("groq", { text: "oi", segments: [{ foo: 1 }, { bar: 2 }] }), "oi");
  });
  it("Deepgram: um parágrafo por linha; sem paragraphs cai no transcript", () => {
    const alt = {
      transcript: "um dois três",
      paragraphs: { paragraphs: [{ sentences: [{ text: "Um." }, { text: "Dois." }] }, { sentences: [{ text: "Três." }] }] },
    };
    assert.equal(lerTranscricaoComQuebras("deepgram", { results: { channels: [{ alternatives: [alt] }] } }), "Um. Dois.\nTrês.");
    assert.equal(lerTranscricaoComQuebras("deepgram", { results: { channels: [{ alternatives: [{ transcript: "oi" }] }] } }), "oi");
  });
  it("ElevenLabs: quebra onde a pausa entre palavras é ≥ 1,2 s; sem pausa, mantém o texto", () => {
    const w = (text: string, start: number, end: number) => ({ text, type: "word", start, end });
    const sp = { text: " ", type: "spacing", start: null, end: null };
    const json = { text: "Oi tudo. Outra coisa.", words: [w("Oi", 0, 0.3), sp, w("tudo.", 0.4, 0.9), sp, w("Outra", 3, 3.3), sp, w("coisa.", 3.4, 3.9)] };
    assert.equal(lerTranscricaoComQuebras("elevenlabs", json), "Oi tudo.\nOutra coisa.");
    const colado = { text: "Oi tudo.", words: [w("Oi", 0, 0.3), sp, w("tudo.", 0.4, 0.9)] };
    assert.equal(lerTranscricaoComQuebras("elevenlabs", colado), "Oi tudo.");
    assert.equal(lerTranscricaoComQuebras("elevenlabs", { text: "Oi" }), "Oi");
  });
  it("OpenAI e Mistral: texto simples", () => {
    assert.equal(lerTranscricaoComQuebras("openai", { text: "oi" }), "oi");
    assert.equal(lerTranscricaoComQuebras("mistral", { text: "oi" }), "oi");
  });
});
