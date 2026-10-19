import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { deveCopiarSelecao } from "./copiarSelecao.ts";

const app = (appId: string) => ({ appId });

describe("deveCopiarSelecao", () => {
  it("copia quando a Acessibilidade não leu o campo", () => {
    assert.equal(deveCopiarSelecao({ app: app("com.apple.Safari"), campo: null }), true);
    assert.equal(deveCopiarSelecao({ app: app("com.apple.Safari"), campo: { leitura: "nenhuma" } }), true);
    assert.equal(deveCopiarSelecao({ app: app("com.apple.Safari"), campo: {} }), true);
  });
  it("não copia quando o campo foi lido (mesmo com seleção vazia)", () => {
    assert.equal(deveCopiarSelecao({ app: app("com.apple.Safari"), campo: { leitura: "valor" } }), false);
    assert.equal(deveCopiarSelecao({ app: app("com.apple.Safari"), campo: { leitura: "marcador" } }), false);
  });
  it("nunca copia em editores que copiam a linha sem seleção", () => {
    for (const id of ["com.microsoft.VSCode", "dev.kiro.desktop", "com.sublimetext.4", "dev.zed.Zed", "com.jetbrains.intellij", "com.jetbrains.pycharm.ce"]) {
      assert.equal(deveCopiarSelecao({ app: app(id), campo: null }), false, id);
    }
  });
  it("não arrisca sem contexto ou sem id do app", () => {
    assert.equal(deveCopiarSelecao(null), false);
    assert.equal(deveCopiarSelecao({ app: null, campo: null }), false);
  });
  it("aceita o appId passado à parte", () => {
    assert.equal(deveCopiarSelecao({ campo: null }, "com.apple.Notes"), true);
    assert.equal(deveCopiarSelecao({ campo: null }, "com.jetbrains.goland"), false);
  });
});
