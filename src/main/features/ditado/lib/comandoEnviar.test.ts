import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extrairComandoEnviar } from "./comandoEnviar.ts";

describe("extrairComandoEnviar", () => {
  it("comando como última frase sozinha", () => {
    assert.deepEqual(extrairComandoEnviar("Pode verificar isso pra mim? Enviar."), { texto: "Pode verificar isso pra mim?", enviar: true });
    assert.deepEqual(extrairComandoEnviar("Tudo certo. Manda!"), { texto: "Tudo certo.", enviar: true });
    assert.deepEqual(extrairComandoEnviar("Fechado, pode mandar."), { texto: "Fechado.", enviar: true });
    assert.deepEqual(extrairComandoEnviar("All good. Send it."), { texto: "All good.", enviar: true });
  });
  it("a fala inteira sendo só o comando", () => {
    assert.deepEqual(extrairComandoEnviar("Enviar."), { texto: "", enviar: true });
  });
  it("não dispara quando a palavra faz parte da frase", () => {
    assert.equal(extrairComandoEnviar("Amanhã eu vou enviar.").enviar, false);
    assert.equal(extrairComandoEnviar("Preciso que você me mande o arquivo.").enviar, false);
    assert.equal(extrairComandoEnviar("Ele manda bem.").enviar, false);
    assert.equal(extrairComandoEnviar("Roda o npm install.").enviar, false);
  });
  it("texto sem comando fica igual", () => {
    const t = "Bom dia a todos.";
    assert.deepEqual(extrairComandoEnviar(t), { texto: t, enviar: false });
  });
});
