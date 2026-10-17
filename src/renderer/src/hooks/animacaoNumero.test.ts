import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DURACAO_NUMERO_MS, easeOutCubic, valorNoInstante } from "./animacaoNumero.ts";

describe("easeOutCubic", () => {
  it("vai de 0 a 1 e limita fora do intervalo", () => {
    assert.equal(easeOutCubic(0), 0);
    assert.equal(easeOutCubic(1), 1);
    assert.equal(easeOutCubic(-3), 0);
    assert.equal(easeOutCubic(7), 1);
  });
  it("é rápida no começo (passa da metade antes da metade do tempo)", () => {
    assert.equal(easeOutCubic(0.5), 0.875); // 1 - 0.5^3
  });
});

describe("valorNoInstante", () => {
  it("começa no valor inicial e termina no final", () => {
    assert.equal(valorNoInstante(0, 1000, 0), 0);
    assert.equal(valorNoInstante(0, 1000, DURACAO_NUMERO_MS), 1000);
    assert.equal(valorNoInstante(0, 1000, DURACAO_NUMERO_MS * 3), 1000);
  });
  it("interpola e arredonda para inteiro", () => {
    assert.equal(valorNoInstante(0, 1000, 100, 200), 875);
    assert.equal(valorNoInstante(10, 3, 100, 200), 4); // 10 - 7*0.875 = 3.875
  });
  it("anima para baixo e com duração zero vai direto ao fim", () => {
    assert.equal(valorNoInstante(100, 0, 200, 200), 0);
    assert.equal(valorNoInstante(5, 9, 0, 0), 9);
  });
});
