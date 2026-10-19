import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { textoParaHtml } from "./html.ts";

describe("textoParaHtml", () => {
  it("devolve null quando não há lista", () => {
    assert.equal(textoParaHtml("Oi, tudo bem?"), null);
    assert.equal(textoParaHtml("Primeiro parágrafo.\n\nSegundo parágrafo.\nCom quebra."), null);
    assert.equal(textoParaHtml("Isso - não é item, nem 1. aqui no meio"), null);
  });
  it("lista simples", () => {
    assert.equal(textoParaHtml("- ovos\n- leite"), "<ul><li>ovos</li><li>leite</li></ul>");
  });
  it("lista numerada (1. e 2))", () => {
    assert.equal(textoParaHtml("1. abrir\n2) fechar"), "<ol><li>abrir</li><li>fechar</li></ol>");
  });
  it("introdução + lista + parágrafo depois", () => {
    assert.equal(
      textoParaHtml("Preciso comprar:\n- ovos\n- leite\n\nObrigado!\nAbraço."),
      "<p>Preciso comprar:</p><ul><li>ovos</li><li>leite</li></ul><p>Obrigado!<br>Abraço.</p>",
    );
  });
  it("lista e lista numerada em sequência viram blocos separados", () => {
    assert.equal(textoParaHtml("- a\n1. b"), "<ul><li>a</li></ul><ol><li>b</li></ol>");
  });
  it("escapa & < > \"", () => {
    assert.equal(textoParaHtml('- a & b\n- <b> "c"'), "<ul><li>a &amp; b</li><li>&lt;b&gt; &quot;c&quot;</li></ul>");
  });
});
