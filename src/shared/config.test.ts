import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AVISO_DEMORA_BASE_MS, TIMEOUT_IA_MS, atrasoAvisoDemoraMs, formatarTempoRestante, prazoIaMs } from "./config.ts";

describe("prazoIaMs", () => {
  it("áudio curto usa o prazo padrão", () => {
    assert.equal(prazoIaMs(0), TIMEOUT_IA_MS);
    assert.equal(prazoIaMs(5_000), TIMEOUT_IA_MS);
  });
  it("áudio longo ganha prazo igual à sua duração (fator 1)", () => {
    assert.equal(prazoIaMs(360_000), 360_000);
    assert.equal(prazoIaMs(TIMEOUT_IA_MS + 1), TIMEOUT_IA_MS + 1);
  });
});

describe("atrasoAvisoDemoraMs", () => {
  it("sem seleção: base + 500 ms por 30 s de áudio (arredondado para cima)", () => {
    assert.equal(atrasoAvisoDemoraMs(10_000, 0), AVISO_DEMORA_BASE_MS + 500);
    assert.equal(atrasoAvisoDemoraMs(30_000, 0), AVISO_DEMORA_BASE_MS + 500);
    assert.equal(atrasoAvisoDemoraMs(30_001, 0), AVISO_DEMORA_BASE_MS + 1000);
    assert.equal(atrasoAvisoDemoraMs(360_000, 0), AVISO_DEMORA_BASE_MS + 12 * 500);
  });
  it("soma 500 ms por 1000 caracteres selecionados", () => {
    assert.equal(atrasoAvisoDemoraMs(10_000, 1), AVISO_DEMORA_BASE_MS + 500 + 500);
    assert.equal(atrasoAvisoDemoraMs(10_000, 2500), AVISO_DEMORA_BASE_MS + 500 + 1500);
  });
});

describe("formatarTempoRestante", () => {
  it("formata minutos e segundos", () => {
    assert.equal(formatarTempoRestante(42), "0:42");
    assert.equal(formatarTempoRestante(60), "1:00");
    assert.equal(formatarTempoRestante(9), "0:09");
  });
  it("arredonda para cima e não passa de zero", () => {
    assert.equal(formatarTempoRestante(41.2), "0:42");
    assert.equal(formatarTempoRestante(-3), "0:00");
  });
});
