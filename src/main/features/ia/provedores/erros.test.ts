// Rodar: npm test
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { explicarErro, extrairDetalhe } from "./erros.ts";
import { cabecalhosChat, textoDaRespostaChat, urlChat } from "./montagemChat.ts";

describe("extrairDetalhe", () => {
  it("lê os formatos dos provedores", () => {
    assert.equal(extrairDetalhe('{"error":{"message":"Invalid API Key"}}'), "Invalid API Key");
    assert.equal(extrairDetalhe('{"error":"Incorrect API key provided."}'), "Incorrect API key provided.");
    assert.equal(extrairDetalhe('{"detail":"Invalid API Key"}'), "Invalid API Key");
    assert.equal(extrairDetalhe('{"detail":{"type":"authentication_error","message":"Invalid API key"}}'), "Invalid API key");
    assert.equal(extrairDetalhe('{"err_code":"INVALID_AUTH","err_msg":"Invalid credentials."}'), "Invalid credentials.");
    assert.equal(extrairDetalhe('{"message":"Unauthorized"}'), "Unauthorized");
  });
  it("lê o erro do Gemini compatível, que vem dentro de um array", () => {
    assert.equal(
      extrairDetalhe('[{"error":{"code":400,"message":"Please pass a valid API key","status":"INVALID_ARGUMENT"}}]'),
      "Please pass a valid API key",
    );
  });
  it("usa o texto cru quando não é JSON", () => {
    assert.equal(extrairDetalhe("<html>Bad gateway</html>"), "<html>Bad gateway</html>");
  });
});

describe("explicarErro", () => {
  it("401 e 403 = chave recusada, com o detalhe entre parênteses", () => {
    assert.equal(
      explicarErro("Groq", 401, '{"error":{"message":"Invalid API Key","type":"invalid_request_error"}}'),
      "Chave recusada pelo Groq. (401: Invalid API Key)",
    );
    assert.match(explicarErro("Lovable", 403, ""), /^Chave recusada pela Lovable\./);
  });
  it("400 com mensagem de chave (Gemini, xAI) = chave recusada", () => {
    assert.equal(
      explicarErro("Google Gemini", 400, '[{"error":{"code":400,"message":"Please pass a valid API key"}}]'),
      "Chave recusada pelo Google Gemini. (400: Please pass a valid API key)",
    );
    assert.match(explicarErro("xAI", 400, '{"error":"Incorrect API key provided."}'), /^Chave recusada pelo xAI\./);
  });
  it("400 que não é de chave continua sendo erro genérico", () => {
    assert.equal(explicarErro("OpenAI", 400, '{"error":{"message":"Unsupported parameter"}}'), "Erro 400 da OpenAI. (400: Unsupported parameter)");
  });
  it("OpenRouter com a mensagem enganosa de header ausente também é chave recusada (401)", () => {
    assert.match(explicarErro("OpenRouter", 401, '{"error":{"message":"Missing Authentication header","code":401}}'), /^Chave recusada pelo OpenRouter\./);
  });
  it("402 sem créditos, 404 modelo, 429 limite", () => {
    assert.match(explicarErro("DeepSeek", 402, '{"error":{"message":"Insufficient Balance"}}'), /^Sem créditos na conta do DeepSeek\./);
    assert.match(explicarErro("Mistral", 404, '{"message":"Model not found"}'), /^Modelo não encontrado na Mistral\./);
    assert.match(explicarErro("Groq", 429, '{"error":{"message":"Rate limit reached"}}'), /^Limite de uso atingido/);
  });
  it("429 por cota esgotada (OpenAI) vira falta de créditos", () => {
    assert.match(explicarErro("OpenAI", 429, '{"error":{"message":"You exceeded your current quota","code":"insufficient_quota"}}'), /^Sem créditos na conta da OpenAI\./);
  });
  it("sem detalhe, só o status", () => {
    assert.equal(explicarErro("Groq", 500, ""), "Erro 500 do Groq. (500)");
  });
});

describe("chat compatível com OpenAI", () => {
  it("monta a URL a partir do catálogo", () => {
    assert.equal(urlChat("lovable"), "https://ai.gateway.lovable.dev/v1/chat/completions");
    assert.equal(urlChat("gemini"), "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
    assert.equal(urlChat("deepseek"), "https://api.deepseek.com/chat/completions");
    assert.equal(urlChat("groq"), "https://api.groq.com/openai/v1/chat/completions");
  });
  it("OpenRouter leva os cabeçalhos de identificação; os outros não", () => {
    const or = cabecalhosChat("openrouter", "k");
    assert.equal(or.Authorization, "Bearer k");
    assert.equal(or["X-Title"], "FalaAi");
    assert.ok(or["HTTP-Referer"]);
    assert.equal(cabecalhosChat("openai", "k")["X-Title"], undefined);
  });
  it("lê o texto de choices[0].message.content (string, partes ou transcrição de áudio)", () => {
    assert.equal(textoDaRespostaChat({ choices: [{ message: { content: "  oi \n" } }] }), "oi");
    assert.equal(textoDaRespostaChat({ choices: [{ message: { content: [{ type: "text", text: "a" }, { type: "text", text: "b" }] } }] }), "ab");
    assert.equal(textoDaRespostaChat({ choices: [{ message: { content: null, audio: { transcript: "falado" } } }] }), "falado");
    assert.equal(textoDaRespostaChat({}), "");
  });
});
