import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { deveAvisarCampoNaoEditavel } from "./campoNaoEditavel.ts";

const semCampo = { campo: null };
const naoEditavel = { campo: { editavel: false } };
const editavel = { campo: { editavel: true } };

describe("deveAvisarCampoNaoEditavel", () => {
  it("avisa sem campo ou com campo não editável", () => {
    assert.equal(deveAvisarCampoNaoEditavel(semCampo, "com.apple.Safari", null), true);
    assert.equal(deveAvisarCampoNaoEditavel(naoEditavel, "com.apple.Safari", "https://exemplo.com"), true);
  });
  it("não avisa com campo editável, ou sem informação de editável (auxiliar antigo)", () => {
    assert.equal(deveAvisarCampoNaoEditavel(editavel, "com.apple.Safari", null), false);
    assert.equal(deveAvisarCampoNaoEditavel({ campo: {} }, "com.apple.Safari", null), false);
  });
  it("não avisa quando a acessibilidade acabou de ser ligada", () => {
    assert.equal(deveAvisarCampoNaoEditavel({ campo: null, acessibilidadeLigada: true }, "com.apple.Safari", null), false);
    assert.equal(deveAvisarCampoNaoEditavel({ campo: null, acessibilidadeLigada: false }, "com.apple.Safari", null), true);
  });
  it("não avisa sem contexto", () => assert.equal(deveAvisarCampoNaoEditavel(null, null, null), false));
  it("não avisa nos apps das duas listas", () => {
    assert.equal(deveAvisarCampoNaoEditavel(semCampo, "com.tinyspeck.slackmacgap", null), false);
    assert.equal(deveAvisarCampoNaoEditavel(semCampo, "com.microsoft.Excel", null), false);
  });
  it("não avisa nos editores de código, onde a acessibilidade não é ligada (Kiro, VS Code)", () => {
    assert.equal(deveAvisarCampoNaoEditavel(semCampo, "dev.kiro.desktop", null), false);
    assert.equal(deveAvisarCampoNaoEditavel(naoEditavel, "com.microsoft.VSCode", null), false);
  });
  it("não avisa nas URLs das listas (por prefixo)", () => {
    assert.equal(deveAvisarCampoNaoEditavel(semCampo, "com.google.Chrome", "https://docs.google.com/document/d/abc/edit"), false);
    assert.equal(deveAvisarCampoNaoEditavel(semCampo, "com.google.Chrome", "https://www.figma.com/design/xyz"), false);
    assert.equal(deveAvisarCampoNaoEditavel(semCampo, "com.google.Chrome", "https://docs.google.com/spreadsheets/d/abc"), true);
  });
});
