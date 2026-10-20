import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pareceInventado } from "./textoInventado.ts";

describe("pareceInventado", () => {
  it("pega o caso real: 39 palavras em 0,84 s (20/10/2026)", () => {
    const inventado =
      "Dá uma olhada no log do Supabase porque eu acho que o erro de silêncio no DuoMac é por causa do timeout da função. Tenta aumentar para 60 segundos e faz o deploy de novo para a gente testar.";
    assert.equal(pareceInventado(inventado, 840), true);
  });
  it("deixa passar ditados normais do histórico (1 a 4 palavras/s)", () => {
    assert.equal(pareceInventado("Te mandei um print aí pra você dar uma olhada.", 2580), false);
    assert.equal(pareceInventado("O resto daí está aprovado.", 3120), false);
    assert.equal(pareceInventado("Não, beleza, só nos detalhes então. E já deixa o detalhes como padrão daí.", 4320), false);
  });
  it("tolera áudio muito curto com poucas palavras", () => {
    assert.equal(pareceInventado("Ok, valeu.", 450), false);
    assert.equal(pareceInventado("Tá, pode mandar, beleza.", 500), false);
  });
  it("não decide sem duração", () => {
    assert.equal(pareceInventado("qualquer texto comprido de várias palavras aqui", 0), false);
    assert.equal(pareceInventado("qualquer texto", Number.NaN), false);
  });
});
