import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { NOVIDADES } from "./novidades.ts";

const pacote = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as { version: string };

/** [1, 2, 0] a partir de "1.2.0". */
const partes = (v: string): number[] => v.split(".").map(Number);

/** Positivo se a > b. */
function comparar(a: string, b: string): number {
  const x = partes(a);
  const y = partes(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

describe("NOVIDADES", () => {
  it("a primeira entrada é a versão do package.json", () => {
    assert.equal(
      NOVIDADES[0]?.versao,
      pacote.version,
      `A versão ${pacote.version} do package.json não tem entrada em src/shared/novidades.ts (a mais nova vai no topo).`,
    );
  });

  it("versões no formato X.Y.Z, sem repetição e da mais nova para a mais antiga", () => {
    const vistas = new Set<string>();
    NOVIDADES.forEach((n, i) => {
      assert.match(n.versao, /^\d+\.\d+\.\d+$/, `Versão "${n.versao}" fora do formato X.Y.Z.`);
      assert.ok(!vistas.has(n.versao), `A versão ${n.versao} aparece mais de uma vez em novidades.ts.`);
      vistas.add(n.versao);
      const anterior = NOVIDADES[i - 1];
      if (anterior) assert.ok(comparar(anterior.versao, n.versao) > 0, `A versão ${n.versao} deveria vir antes de ${anterior.versao} (ordem decrescente).`);
    });
  });

  it("datas AAAA-MM-DD válidas e nunca crescendo da mais nova para a mais antiga", () => {
    NOVIDADES.forEach((n, i) => {
      assert.match(n.data, /^\d{4}-\d{2}-\d{2}$/, `Data "${n.data}" da versão ${n.versao} fora do formato AAAA-MM-DD.`);
      const d = new Date(`${n.data}T00:00:00Z`);
      assert.ok(!Number.isNaN(d.getTime()) && d.toISOString().startsWith(n.data), `Data "${n.data}" da versão ${n.versao} não existe.`);
      const anterior = NOVIDADES[i - 1];
      if (anterior) assert.ok(anterior.data >= n.data, `A data ${n.data} (versão ${n.versao}) é mais nova que a da versão ${anterior.versao}.`);
    });
  });

  it("toda versão tem itens, e nenhum é vazio", () => {
    for (const n of NOVIDADES) {
      assert.ok(n.itens.length > 0, `A versão ${n.versao} não tem itens.`);
      for (const item of n.itens) assert.ok(item.trim().length > 0, `A versão ${n.versao} tem um item vazio.`);
    }
  });
});
