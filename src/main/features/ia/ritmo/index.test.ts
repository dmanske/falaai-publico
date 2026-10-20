// Rodar: npm test
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { analisarRitmo, poucaFala } from "./index.ts";
import { blocoRitmo, MAX_PAUSAS_NO_BLOCO } from "./bloco.ts";

const TAXA = 16000;

/** Trecho: "fala" (senoide de 200 Hz com amplitude variando) ou "sil" (ruído baixo). */
type Trecho = ["fala" | "sil", number];

function gerarPcm(trechos: Trecho[]): Int16Array {
  const total = trechos.reduce((s, [, d]) => s + Math.round(d * TAXA), 0);
  const pcm = new Int16Array(total);
  let semente = 12345;
  const aleatorio = () => ((semente = (semente * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;
  let i = 0;
  for (const [tipo, d] of trechos) {
    const n = Math.round(d * TAXA);
    for (let k = 0; k < n; k++, i++) {
      if (tipo === "fala") {
        const amp = 0.25 + 0.15 * Math.sin(2 * Math.PI * 3 * (k / TAXA)); // 0,10 a 0,40
        pcm[i] = Math.round(amp * Math.sin(2 * Math.PI * 200 * (k / TAXA)) * 32767);
      } else {
        pcm[i] = Math.round(0.002 * aleatorio() * 32767);
      }
    }
  }
  return pcm;
}

/** Monta um WAV; `extra` põe um chunk desconhecido antes de "data". */
function montarWav(pcm: Int16Array, extra = false): Buffer {
  const dados = Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  const fmt = Buffer.alloc(24);
  fmt.write("fmt ", 0, "ascii");
  fmt.writeUInt32LE(16, 4);
  fmt.writeUInt16LE(1, 8);
  fmt.writeUInt16LE(1, 10);
  fmt.writeUInt32LE(TAXA, 12);
  fmt.writeUInt32LE(TAXA * 2, 16);
  fmt.writeUInt16LE(2, 20);
  fmt.writeUInt16LE(16, 22);
  const lista = Buffer.alloc(8 + 6);
  lista.write("LIST", 0, "ascii");
  lista.writeUInt32LE(6, 4);
  lista.write("abcdef", 8, "ascii");
  const cab = Buffer.alloc(8 + 4);
  cab.write("RIFF", 0, "ascii");
  cab.write("WAVE", 8, "ascii");
  const dh = Buffer.alloc(8);
  dh.write("data", 0, "ascii");
  dh.writeUInt32LE(dados.length, 4);
  const corpo = Buffer.concat([cab, fmt, ...(extra ? [lista] : []), dh, dados]);
  corpo.writeUInt32LE(corpo.length - 8, 4);
  return corpo;
}

const perto = (a: number, b: number, tol = 0.1) => assert.ok(Math.abs(a - b) <= tol, `${a} deveria estar perto de ${b}`);

describe("analisarRitmo", () => {
  it("acha as pausas e ignora o silêncio do começo e do fim", () => {
    const r = analisarRitmo(
      montarWav(gerarPcm([["sil", 1], ["fala", 2], ["sil", 0.8], ["fala", 2], ["sil", 0.3], ["fala", 1], ["sil", 2], ["fala", 1.5], ["sil", 1]])),
    );
    perto(r.duracaoS, 11.6, 0.01);
    assert.equal(r.pausas.length, 2); // a de 0,3 s não conta
    perto(r.pausas[0].inicioS, 3);
    perto(r.pausas[0].duracaoS, 0.8);
    assert.equal(r.pausas[0].tipo, "curta");
    perto(r.pausas[1].inicioS, 7.1);
    perto(r.pausas[1].duracaoS, 2);
    assert.equal(r.pausas[1].tipo, "longa");
    perto(r.falaS, 6.5, 0.2);
  });

  it("fala corrida sem pausas", () => {
    const r = analisarRitmo(montarWav(gerarPcm([["sil", 0.5], ["fala", 6], ["sil", 0.5]])));
    assert.equal(r.pausas.length, 0);
    perto(r.falaS, 6, 0.2);
  });

  it("silêncio total: sem fala e sem pausas", () => {
    const r = analisarRitmo(montarWav(gerarPcm([["sil", 3]])));
    assert.deepEqual(r.pausas, []);
    assert.equal(r.falaS, 0);
    perto(r.duracaoS, 3, 0.01);
  });

  it("áudio vazio, lixo e cabeçalho truncado não lançam", () => {
    assert.deepEqual(analisarRitmo(montarWav(new Int16Array(0))), { duracaoS: 0, falaS: 0, pausas: [] });
    assert.deepEqual(analisarRitmo(Buffer.alloc(0)), { duracaoS: 0, falaS: 0, pausas: [] });
    assert.deepEqual(analisarRitmo(Buffer.from("isto não é um wav de jeito nenhum")), { duracaoS: 0, falaS: 0, pausas: [] });
  });

  it("acha o chunk data depois de um chunk extra", () => {
    const pcm = gerarPcm([["fala", 1], ["sil", 1.5], ["fala", 1]]);
    const a = analisarRitmo(montarWav(pcm, true));
    const b = analisarRitmo(montarWav(pcm, false));
    assert.deepEqual(a, b);
    assert.equal(a.pausas.length, 1);
    assert.equal(a.pausas[0].tipo, "longa");
  });

  it("tamanho do chunk data maior que o arquivo vale até o fim do buffer", () => {
    const w = montarWav(gerarPcm([["fala", 1], ["sil", 1], ["fala", 1]]));
    w.writeUInt32LE(0xffffffff, w.indexOf("data") + 4);
    assert.equal(analisarRitmo(w).pausas.length, 1);
  });
});

describe("poucaFala (áudio nem vai para a IA)", () => {
  it("silêncio e estalo curto: pouca fala", () => {
    assert.equal(poucaFala(analisarRitmo(montarWav(gerarPcm([["sil", 0.84]])))), true);
    assert.equal(poucaFala(analisarRitmo(montarWav(gerarPcm([["sil", 0.4], ["fala", 0.05], ["sil", 0.4]])))), true);
  });
  it("uma palavra curta já basta", () => {
    assert.equal(poucaFala(analisarRitmo(montarWav(gerarPcm([["sil", 0.3], ["fala", 0.3], ["sil", 0.3]])))), false);
  });
  it("WAV ilegível não bloqueia (fica com a IA)", () => {
    assert.equal(poucaFala(analisarRitmo(Buffer.from("isto não é um wav"))), false);
  });
});

describe("blocoRitmo", () => {
  const p = (i: number, tipo: "curta" | "longa") => ({ inicioS: i, fimS: i + (tipo === "longa" ? 1.5 : 0.5), duracaoS: tipo === "longa" ? 1.5 : 0.5, tipo });
  it("vazio sem pausas", () => {
    assert.equal(blocoRitmo({ duracaoS: 5, falaS: 5, pausas: [] }), "");
  });
  it("lista as pausas com vírgula decimal", () => {
    const b = blocoRitmo({ duracaoS: 23.4, falaS: 18, pausas: [p(4.1, "curta"), p(9.8, "longa")] });
    assert.match(b, /## Ritmo da fala \(medido no áudio\)/);
    assert.match(b, /Duração 23,4 s/);
    assert.match(b, /4,1–4,6 s \(curta\), 9,8–11,3 s \(longa\)/);
    assert.match(b, /Não escreva nada sobre pausas/);
  });
  it("acima do limite lista só as longas", () => {
    const pausas = Array.from({ length: MAX_PAUSAS_NO_BLOCO + 5 }, (_, i) => p(i * 3, i % 5 === 0 ? "longa" : "curta"));
    const b = blocoRitmo({ duracaoS: 100, falaS: 80, pausas });
    assert.doesNotMatch(b, /\(curta\)/);
    assert.match(b, /30 pausas no total/);
  });
});
