// Rodar: npm test
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { converterModelosOpenRouter } from "./openrouterConversao.ts";

const amostra = [
  { id: "google/gemini-3.8-flash", name: "Google: Gemini 3.8 Flash", context_length: 1048576, architecture: { input_modalities: ["text", "audio"] }, pricing: { prompt: "0.000000825", completion: "0.000004125", audio: "0.000000825" } },
  { id: "google/gemini-3.5-flash-lite", name: "Google: Gemini 3.5 Flash Lite", architecture: { input_modalities: ["text", "audio"] }, pricing: { prompt: "0.0000003", completion: "0.0000025" } },
  { id: "thinkingmachines/inkling-small:free", name: "Thinking Machines: Inkling Small (free)", architecture: { input_modalities: ["text"] }, pricing: { prompt: "0", completion: "0" } },
  { id: "openai/gpt-audio", name: "OpenAI: GPT Audio", architecture: { input_modalities: ["text", "audio"] }, pricing: { prompt: "0.0000025", completion: "0.00001", audio: "0.000032" } },
  { id: "openai/gpt-audio:batch", name: "OpenAI: GPT Audio (batch)", pricing: { prompt: "0.000001", completion: "0.000005" } },
  { id: "openrouter/auto", name: "Auto Router", pricing: { prompt: "-1", completion: "-1" } },
  { id: "x-ai/grok-9", pricing: { prompt: "0.000002" } },
];

describe("converterModelosOpenRouter", () => {
  const lista = converterModelosOpenRouter(amostra);

  it("remove variantes :batch e roteadores com preço negativo", () => {
    const ids = lista.map((m) => m.id);
    assert.ok(!ids.includes("openai/gpt-audio:batch"));
    assert.ok(!ids.includes("openrouter/auto"));
    assert.equal(lista.length, 5);
  });

  it("converte preço por token para US$ por 1 milhão", () => {
    const m = lista.find((x) => x.id === "google/gemini-3.8-flash")!;
    assert.equal(m.precoEntrada, 0.825);
    assert.equal(m.precoSaida, 4.125);
    assert.equal(m.precoAudio, 0.825);
    assert.equal(m.contexto, 1048576);
    assert.equal(m.ouveAudio, true);
    assert.equal(lista.find((x) => x.id === "x-ai/grok-9")!.precoSaida, null);
  });

  it("separa fabricante e nome; sem ':' usa o prefixo do id", () => {
    const m = lista.find((x) => x.id === "google/gemini-3.5-flash-lite")!;
    assert.equal(m.fabricante, "Google");
    assert.equal(m.nome, "Gemini 3.5 Flash Lite");
    const g = lista.find((x) => x.id === "x-ai/grok-9")!;
    assert.equal(g.fabricante, "xAI");
    assert.equal(g.nome, "x-ai/grok-9");
  });

  it("marca gratuitos e quem não ouve áudio", () => {
    const f = lista.find((x) => x.id.endsWith(":free"))!;
    assert.equal(f.gratis, true);
    assert.equal(f.ouveAudio, false);
    assert.equal(lista.find((x) => x.id === "openai/gpt-audio")!.gratis, false);
  });

  it("ordena por fabricante e, dentro dele, do mais barato ao mais caro", () => {
    assert.deepEqual(
      lista.map((m) => m.id),
      ["google/gemini-3.5-flash-lite", "google/gemini-3.8-flash", "openai/gpt-audio", "thinkingmachines/inkling-small:free", "x-ai/grok-9"],
    );
  });
});
