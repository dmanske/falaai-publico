// Rodar: npm test
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { contarPalavras } from "./contarPalavras.ts";

describe("contarPalavras", () => {
  it("conta palavras simples", () => assert.equal(contarPalavras("olá mundo, tudo bem?"), 4));
  it("texto vazio ou só espaços = 0", () => {
    assert.equal(contarPalavras(""), 0);
    assert.equal(contarPalavras("  \n\t "), 0);
  });
  it("ignora espaços múltiplos e quebras de linha", () => assert.equal(contarPalavras("a  b\n\nc"), 3));
  it("ignora símbolos soltos", () => assert.equal(contarPalavras("um — dois ... três"), 3));
  it("conta números e acentos", () => assert.equal(contarPalavras("são 25 reais"), 3));
});
