// Rodar: npm test
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AJUSTES, ajustesPendentes } from "./ajustes.ts";

describe("ajustesPendentes", () => {
  it("preferências salvas antes da 1.1.3 (sem a lista) desligam o Dock uma vez", () => {
    assert.deepEqual(ajustesPendentes({ ajustesAplicados: [] }), {
      mostrarNoDock: false,
      ajustesAplicados: ["dock-desligado-1.1.3"],
    });
  });

  it("ajuste já aplicado não roda de novo (quem ligou o Dock depois continua com ele ligado)", () => {
    assert.equal(ajustesPendentes({ ajustesAplicados: ["dock-desligado-1.1.3"] }), null);
  });

  it("aplica só os que faltam e mantém os ids já gravados", () => {
    const ajustes = [
      { id: "a", mudar: { sons: false } },
      { id: "b", mudar: { tema: "escuro" as const } },
    ];
    assert.deepEqual(ajustesPendentes({ ajustesAplicados: ["a"] }, ajustes), {
      tema: "escuro",
      ajustesAplicados: ["a", "b"],
    });
  });

  it("ids não se repetem", () => {
    const ids = AJUSTES.map((a) => a.id);
    assert.equal(new Set(ids).size, ids.length);
  });
});
