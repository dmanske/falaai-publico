import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dataPorExtenso } from "./formatarData.ts";

describe("dataPorExtenso", () => {
  it("escreve a data em português, sem zero à esquerda no dia", () => {
    assert.equal(dataPorExtenso("2026-10-18"), "18 de outubro de 2026");
    assert.equal(dataPorExtenso("2026-03-05"), "5 de março de 2026");
    assert.equal(dataPorExtenso("2025-12-31"), "31 de dezembro de 2025");
  });
  it("devolve o texto original quando não é uma data AAAA-MM-DD", () => {
    assert.equal(dataPorExtenso("18/10/2026"), "18/10/2026");
    assert.equal(dataPorExtenso("2026-13-01"), "2026-13-01");
  });
});
