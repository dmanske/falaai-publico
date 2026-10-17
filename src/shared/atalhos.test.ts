import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ATALHOS_PADRAO, rotuloTecla, validarAtalho } from "./atalhos.ts";

const todos = ATALHOS_PADRAO.darwin;

describe("validarAtalho", () => {
  it("aceita combinações e toque duplo de modificadora", () => {
    assert.deepEqual(validarAtalho("ditado", ["Duplo", "OptionRight"], todos), { erro: null, aviso: null });
    assert.deepEqual(validarAtalho("pergunte", ["Ctrl", "Option", "P"], todos), { erro: null, aviso: null });
    assert.equal(validarAtalho("ditado", ["F5"], todos).erro, null);
  });
  it("toque duplo de letra passa com aviso", () => {
    const r = validarAtalho("traducao", ["Duplo", "A"], todos);
    assert.equal(r.erro, null);
    assert.match(r.aviso ?? "", /letra dobrada/);
  });
  it("recusa formas inválidas", () => {
    assert.ok(validarAtalho("ditado", [], todos).erro);
    assert.ok(validarAtalho("ditado", ["Duplo"], todos).erro);
    assert.ok(validarAtalho("ditado", ["Duplo", "A", "B"], todos).erro);
    assert.ok(validarAtalho("ditado", ["A", "Duplo"], todos).erro);
    assert.ok(validarAtalho("ditado", ["A"], todos).erro);
    assert.ok(validarAtalho("ditado", ["Ctrl", "A", "B"], todos).erro);
  });
  it("recusa repetido e segurar × toque duplo na mesma tecla", () => {
    assert.match(validarAtalho("traducao", ["Fn", "Space"], todos).erro ?? "", /Pergunte/);
    assert.match(validarAtalho("traducao", ["Duplo", "Fn"], todos).erro ?? "", /Ditado/);
  });
});

describe("rotuloTecla", () => {
  it("mostra o toque duplo como 2×", () => {
    assert.equal(rotuloTecla("Duplo", "darwin"), "2×");
  });
});
