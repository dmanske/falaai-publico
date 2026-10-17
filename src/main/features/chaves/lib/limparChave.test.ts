// Mesmos casos de almoxarifado_manske_oficial/src/features/agente-ia/utils/chaves.test.ts.
// Rodar: npm test
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { limparChave } from "./limparChave.ts";

describe("limparChave", () => {
  it("deixa a chave pura como está (inclusive o == do fim)", () => {
    assert.equal(limparChave("sk_abc+def/ghi=="), "sk_abc+def/ghi==");
    assert.equal(limparChave("  550e8400-e29b-41d4-a716-446655440000 \n"), "550e8400-e29b-41d4-a716-446655440000");
  });

  it("corta a linha de baixo do .env colada junto (o caso da chave da Lovable)", () => {
    assert.equal(limparChave('sk_abc+def/ghi=="\nLOVABLE_AI_MODEL="google/gemini-3-flash-preview"'), "sk_abc+def/ghi==");
  });

  it("aceita a linha inteira do .env, com ou sem export e aspas", () => {
    assert.equal(limparChave('LOVABLE_API_KEY="sk_abc=="'), "sk_abc==");
    assert.equal(limparChave("export ELEVENLABS_API_KEY='sk_123'"), "sk_123");
    assert.equal(limparChave("ELEVENLABS_API_KEY=sk_123"), "sk_123");
  });

  it("pula comentários e para no primeiro espaço", () => {
    assert.equal(limparChave('# IA — Lovable\n# Endpoint…\nLOVABLE_API_KEY="sk_x=="\nLOVABLE_AI_MODEL="m"'), "sk_x==");
    assert.equal(limparChave("sk_x  # minha chave"), "sk_x");
  });

  it("vazio continua vazio", () => {
    assert.equal(limparChave(""), "");
    assert.equal(limparChave('  ""  '), "");
  });
});
