// Rodar: npm test
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { diaAnterior, hojeLocal, maiorSequencia, sequenciaAtual } from "./sequencias.ts";

describe("sequenciaAtual", () => {
  it("sem dias = 0", () => assert.equal(sequenciaAtual([], "2026-10-17"), 0));
  it("termina hoje", () => assert.equal(sequenciaAtual(["2026-10-15", "2026-10-16", "2026-10-17"], "2026-10-17"), 3));
  it("termina ontem (hoje ainda sem uso)", () => assert.equal(sequenciaAtual(["2026-10-15", "2026-10-16"], "2026-10-17"), 2));
  it("zera após um dia inteiro sem uso", () => assert.equal(sequenciaAtual(["2026-10-14", "2026-10-15"], "2026-10-17"), 0));
  it("buraco interrompe", () => assert.equal(sequenciaAtual(["2026-10-13", "2026-10-15", "2026-10-16", "2026-10-17"], "2026-10-17"), 3));
  it("atravessa virada de mês e ano", () => assert.equal(sequenciaAtual(["2025-12-31", "2026-01-01"], "2026-01-01"), 2));
});

describe("maiorSequencia", () => {
  it("vazio = 0", () => assert.equal(maiorSequencia([]), 0));
  it("acha a maior entre várias", () =>
    assert.equal(maiorSequencia(["2026-01-01", "2026-01-02", "2026-02-10", "2026-02-11", "2026-02-12", "2026-03-01"]), 3));
  it("não depende da ordem e ignora repetidos", () => assert.equal(maiorSequencia(["2026-03-02", "2026-03-01", "2026-03-01"]), 2));
  it("fevereiro bissexto", () => assert.equal(maiorSequencia(["2028-02-28", "2028-02-29", "2028-03-01"]), 3));
});

describe("datas", () => {
  it("diaAnterior cruza o mês", () => assert.equal(diaAnterior("2026-03-01"), "2026-02-28"));
  it("hojeLocal usa a data local", () => assert.equal(hojeLocal(new Date(2026, 9, 7, 23, 59)), "2026-10-07"));
});
