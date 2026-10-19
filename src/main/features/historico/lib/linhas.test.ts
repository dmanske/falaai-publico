import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { linhaParaItem, type LinhaHistorico } from "./linhas.ts";

const base: LinhaHistorico = {
  id: "1", criado_em: "2026-10-18T12:00:00.000Z", modo: "ditado", texto: "", texto_selecionado: null, duracao_ms: 1000,
  palavras: 0, app: null, app_id: null, url: null, status: "ok", erro: null, audio_arquivo: null,
};

describe("linhaParaItem: status", () => {
  it("mapeia ok, erro e cancelado", () => {
    assert.equal(linhaParaItem({ ...base, status: "ok" }).status, "ok");
    assert.equal(linhaParaItem({ ...base, status: "erro" }).status, "erro");
    assert.equal(linhaParaItem({ ...base, status: "cancelado" }).status, "cancelado");
  });
  it("valor desconhecido cai em ok", () => assert.equal(linhaParaItem({ ...base, status: "xyz" }).status, "ok"));
  it("temAudio vem do arquivo", () => {
    assert.equal(linhaParaItem({ ...base, audio_arquivo: "1.wav" }).temAudio, true);
    assert.equal(linhaParaItem(base).temAudio, false);
  });
});
