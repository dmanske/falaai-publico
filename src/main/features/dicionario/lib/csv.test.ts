// Rodar: npm test
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { lerLista } from "./csv.ts";
import { validarTermo } from "./termo.ts";

describe("lerLista", () => {
  it("uma palavra por linha, ignorando vazios e repetidos", () => {
    const r = lerLista("Lovable\n\nSupabase\r\nlovable\n  Manske  \n");
    assert.deepEqual(r.termos, ["Lovable", "Supabase", "Manske"]);
    assert.equal(r.ignoradas, 1);
  });

  it("primeira coluna de CSV com , ; e tab, ignorando cabeçalho", () => {
    assert.deepEqual(lerLista("palavra,categoria\nLovable,ferramenta\nVercel,hospedagem").termos, ["Lovable", "Vercel"]);
    assert.deepEqual(lerLista("Termo;Nota\nSupabase;banco\nManske;nome").termos, ["Supabase", "Manske"]);
    assert.deepEqual(lerLista("word\tx\nKiro\ty").termos, ["Kiro"]);
  });

  it("campos entre aspas", () => {
    const r = lerLista('"Acme, Inc.",x\n"Ele disse ""oi""",y');
    assert.deepEqual(r.termos, ['Acme, Inc.', 'Ele disse "oi"']);
  });

  it("BOM e linhas inválidas (longas) contam como ignoradas", () => {
    const r = lerLista("﻿Terms\nOk\n" + "x".repeat(61) + "\n,vazio");
    assert.deepEqual(r.termos, ["Ok"]);
    assert.equal(r.ignoradas, 2);
  });

  it("arquivo vazio", () => {
    assert.deepEqual(lerLista(""), { termos: [], ignoradas: 0 });
  });
});

describe("validarTermo", () => {
  it("apara e valida", () => {
    assert.deepEqual(validarTermo("  Lovable "), { termo: "Lovable" });
    assert.ok("erro" in validarTermo("   "));
    assert.ok("erro" in validarTermo("a\nb"));
    assert.ok("erro" in validarTermo("x".repeat(61)));
    assert.deepEqual(validarTermo("x".repeat(60)), { termo: "x".repeat(60) });
  });
});
