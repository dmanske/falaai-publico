// Rodar: npm test. Erros do SDK da Anthropic traduzidos pelas classes tipadas.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import Anthropic from "@anthropic-ai/sdk";
import { explicarErroAnthropic, juntarBlocosDeTexto, modeloTemFallback } from "./anthropicApoio.ts";

const erroApi = (status: number, mensagem: string) =>
  Anthropic.APIError.generate(status, { type: "error", error: { type: "x", message: mensagem } }, mensagem, new Headers());

describe("explicarErroAnthropic", () => {
  it("401 e 403 = chave recusada", () => {
    assert.equal(explicarErroAnthropic(erroApi(401, "invalid x-api-key")), "Chave recusada pela Anthropic. (401: invalid x-api-key)");
    assert.match(explicarErroAnthropic(erroApi(403, "forbidden")), /^Chave recusada pela Anthropic/);
  });
  it("404 modelo, 429 limite, 529 sobrecarga, 400 sem créditos", () => {
    assert.match(explicarErroAnthropic(erroApi(404, "model: x")), /^Modelo não encontrado/);
    assert.match(explicarErroAnthropic(erroApi(429, "rate")), /^Limite de uso atingido/);
    assert.match(explicarErroAnthropic(erroApi(529, "Overloaded")), /sobrecarregada/);
    assert.match(explicarErroAnthropic(erroApi(400, "Your credit balance is too low")), /^Sem créditos/);
    assert.match(explicarErroAnthropic(erroApi(400, "thinking: not allowed")), /^Erro 400 da Anthropic/);
  });
  it("erros de conexão e de tempo", () => {
    assert.equal(explicarErroAnthropic(new Anthropic.APIConnectionTimeoutError()), "A IA demorou demais para responder.");
    assert.match(explicarErroAnthropic(new Anthropic.APIConnectionError({ message: "x" })), /^Falha de conexão/);
  });
});

describe("resposta do Claude", () => {
  it("junta só os blocos de texto e ignora thinking", () => {
    assert.equal(
      juntarBlocosDeTexto([{ type: "thinking" }, { type: "text", text: "Olá, " }, { type: "text", text: "mundo." }]),
      "Olá, mundo.",
    );
  });
  it("fallback no servidor só no Opus e no Sonnet", () => {
    assert.equal(modeloTemFallback("claude-opus-5-5"), true);
    assert.equal(modeloTemFallback("claude-sonnet-5-5"), true);
    assert.equal(modeloTemFallback("claude-haiku-5-5"), false);
  });
});
