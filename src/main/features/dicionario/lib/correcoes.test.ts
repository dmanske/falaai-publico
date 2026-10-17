// Rodar: npm test
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { encontrarCorrecoes } from "./correcoes.ts";

describe("encontrarCorrecoes", () => {
  it("aprende Lovable quando Lovebow é corrigido", () => {
    const r = encontrarCorrecoes("Roda o Lovebow", "Roda o Lovable");
    assert.equal(r.localizado, true);
    assert.deepEqual(r.termos, ["Lovable"]);
  });

  it("não aprende correção de acentuação", () => {
    const r = encontrarCorrecoes("Eu acho que voce sabe", "Eu acho que você sabe");
    assert.equal(r.localizado, true);
    assert.deepEqual(r.termos, []);
  });

  it("não aprende maiúscula no início de frase", () => {
    assert.deepEqual(encontrarCorrecoes("oi tudo bem. amanhã eu vou", "oi tudo bem. Amanhã eu vou").termos, []);
    assert.deepEqual(encontrarCorrecoes("casa grande", "Casa grande").termos, []);
  });

  it("aprende maiúscula no meio da frase", () => {
    assert.deepEqual(encontrarCorrecoes("fala com o manske hoje", "fala com o Manske hoje").termos, ["Manske"]);
  });

  it("usuário apagou tudo: nada e não localizado", () => {
    const r = encontrarCorrecoes("Roda o Lovebow", "");
    assert.equal(r.localizado, false);
    assert.deepEqual(r.termos, []);
  });

  it("texto colado no meio de outro maior ainda é localizado", () => {
    const campo = "Oi pessoal, segue o recado de ontem. Roda o Lovable depois do almoço, valeu! Abraço do time.";
    const r = encontrarCorrecoes("Roda o Lovebow depois do almoço", campo);
    assert.equal(r.localizado, true);
    assert.deepEqual(r.termos, ["Lovable"]);
  });

  it("trocar por palavra comum parecida não aprende", () => {
    assert.deepEqual(encontrarCorrecoes("a casa é bonita", "a cada é bonita").termos, []);
  });

  it("aprende termo com dígito e correção no começo do texto", () => {
    assert.deepEqual(encontrarCorrecoes("Supabase e gpt4 funcionam", "Supabase e GPT-4 funcionam").termos.length, 1);
    assert.deepEqual(encontrarCorrecoes("Supabas guarda os dados", "Supabase guarda os dados").termos, ["Supabase"]);
  });

  it("texto totalmente diferente: não localizado", () => {
    const r = encontrarCorrecoes("Roda o Lovebow agora", "Reunião marcada para sexta-feira às dez");
    assert.equal(r.localizado, false);
  });

  it("texto igual: nada a aprender", () => {
    const r = encontrarCorrecoes("Roda o Lovebow", "Roda o Lovebow");
    assert.equal(r.localizado, true);
    assert.deepEqual(r.termos, []);
  });
});
