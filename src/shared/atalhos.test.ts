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

describe("validarAtalho: botões do mouse", () => {
  it("aceita o botão sozinho, com modificador e com toque duplo", () => {
    assert.deepEqual(validarAtalho("ditado", ["Mouse4"], todos), { erro: null, aviso: null });
    assert.deepEqual(validarAtalho("ditado", ["Fn", "Mouse3"], todos), { erro: null, aviso: null });
    assert.deepEqual(validarAtalho("ditado", ["Duplo", "Mouse5"], todos), { erro: null, aviso: null });
  });
  it("conta como a tecla comum (no máximo uma)", () => {
    assert.ok(validarAtalho("ditado", ["Mouse4", "Mouse5"], todos).erro);
    assert.ok(validarAtalho("ditado", ["Fn", "Mouse4", "A"], todos).erro);
  });
  it("não conta como tecla que digita (sem aviso no toque duplo)", () => {
    assert.equal(validarAtalho("ditado", ["Duplo", "Mouse4"], todos).aviso, null);
  });
  it("recusa repetido", () => {
    const outros = { ...todos, pergunte: ["Mouse4"] };
    assert.match(validarAtalho("ditado", ["Mouse4"], outros).erro ?? "", /Pergunte/);
  });
  it("no Windows dá erro", () => {
    assert.match(validarAtalho("ditado", ["Mouse4"], ATALHOS_PADRAO.win32, "win32").erro ?? "", /só funcionam no Mac/);
    assert.match(validarAtalho("ditado", ["Duplo", "Mouse3"], ATALHOS_PADRAO.win32, "win32").erro ?? "", /só funcionam no Mac/);
  });
});

describe("rotuloTecla", () => {
  it("rotula os botões do mouse no Mac", () => {
    assert.equal(rotuloTecla("Mouse3", "darwin"), "Botão do meio");
    assert.equal(rotuloTecla("Mouse4", "darwin"), "Botão 4 do mouse");
    assert.equal(rotuloTecla("Mouse5", "darwin"), "Botão 5 do mouse");
  });
  it("mostra o toque duplo como 2×", () => {
    assert.equal(rotuloTecla("Duplo", "darwin"), "2×");
  });
});
