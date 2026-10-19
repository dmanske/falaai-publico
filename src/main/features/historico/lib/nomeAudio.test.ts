import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { nomeArquivoAudio } from "./nomeAudio.ts";

describe("nomeArquivoAudio", () => {
  it("usa data e hora locais no formato combinado", () => {
    const local = new Date(2026, 9, 18, 9, 5).toISOString();
    assert.equal(nomeArquivoAudio(local), "FalaAi 2026-10-18 09h05.wav");
  });
});
