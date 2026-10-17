import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ajustarEspacoInicial, contarPalavras, limparInicio } from "./espacamento.ts";

describe("ajustarEspacoInicial", () => {
  it("põe espaço quando o cursor está grudado numa palavra ou pontuação", () => {
    assert.equal(ajustarEspacoInicial("Olá,", "tudo bem?"), " tudo bem?");
    assert.equal(ajustarEspacoInicial("Bom dia", "pessoal"), " pessoal");
  });
  it("não põe espaço no campo vazio, depois de espaço/quebra ou abrindo parênteses", () => {
    assert.equal(ajustarEspacoInicial("", "Oi"), "Oi");
    assert.equal(ajustarEspacoInicial("Bom dia ", "pessoal"), "pessoal");
    assert.equal(ajustarEspacoInicial("linha\n", "Nova"), "Nova");
    assert.equal(ajustarEspacoInicial("(", "nota"), "nota");
  });
  it("não põe espaço antes de pontuação", () => {
    assert.equal(ajustarEspacoInicial("Bom dia", ", pessoal"), ", pessoal");
    assert.equal(ajustarEspacoInicial("Feito", "."), ".");
  });
});

describe("contarPalavras", () => {
  it("conta palavras separadas por qualquer espaço", () => {
    assert.equal(contarPalavras("Roda o npm install"), 4);
    assert.equal(contarPalavras("  linha 1\nlinha 2  "), 4);
    assert.equal(contarPalavras(""), 0);
  });
});

describe("limparInicio", () => {
  it("tira a vírgula do começo quando não há frase em aberto (caso real)", () => {
    assert.equal(limparInicio("", ", fala também que foi criado por Daniel Manske, beleza?"), "Fala também que foi criado por Daniel Manske, beleza?");
    assert.equal(limparInicio("Fiz o deploy.", ", e agora?"), "E agora?");
    assert.equal(limparInicio("linha\n", "; ok"), "Ok");
  });
  it("mantém quando está mesmo continuando uma frase", () => {
    assert.equal(limparInicio("Bom dia", ", pessoal"), ", pessoal");
  });
  it("não mexe em texto que não começa com vírgula", () => {
    assert.equal(limparInicio("", "Oi"), "Oi");
  });
});
