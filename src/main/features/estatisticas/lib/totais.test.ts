// Rodar: npm test
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { ajustarReprocessamento, lerResumo, SQL_CRIAR_TOTAIS, semearTotais, somarDitado } from "./totais.ts";

const OPCOES = { velocidadePpm: 40, hoje: "2026-10-17" };

function novoBanco(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE historico (id TEXT PRIMARY KEY, criado_em TEXT NOT NULL, modo TEXT NOT NULL, texto TEXT NOT NULL DEFAULT '',
    duracao_ms INTEGER NOT NULL DEFAULT 0, palavras INTEGER NOT NULL DEFAULT 0, app TEXT, status TEXT NOT NULL)`);
  db.exec(SQL_CRIAR_TOTAIS);
  return db;
}

let n = 0;
function inserir(db: DatabaseSync, criadoEm: string, o: { modo?: string; palavras?: number; ms?: number; app?: string | null; status?: string } = {}) {
  db.prepare("INSERT INTO historico (id, criado_em, modo, duracao_ms, palavras, app, status) VALUES (?,?,?,?,?,?,?)").run(
    `id${n++}`, criadoEm, o.modo ?? "ditado", o.ms ?? 10_000, o.palavras ?? 20, o.app === undefined ? "Notas" : o.app, o.status ?? "ok",
  );
}

/** Consultas antigas (direto do histórico), para comparar com as novas. */
function resumoAntigo(db: DatabaseSync) {
  const D = "date(criado_em, 'localtime')";
  const P = "CASE WHEN modo = 'pergunte' THEN 0 ELSE palavras END";
  const M = "CASE WHEN modo = 'pergunte' THEN 0 ELSE duracao_ms END";
  const tot = db.prepare(`SELECT COUNT(*) AS d, COALESCE(SUM(${P}),0) AS p, COALESCE(SUM(${M}),0) AS ms FROM historico WHERE status='ok'`).get() as { d: number; p: number; ms: number };
  const porApp = db.prepare(`SELECT COALESCE(NULLIF(TRIM(app), ''), 'Outro') AS app, SUM(${P}) AS palavras, COUNT(*) AS ditados FROM historico WHERE status='ok' GROUP BY 1 ORDER BY palavras DESC, ditados DESC, app LIMIT 10`).all();
  const dias = db.prepare(`SELECT ${D} AS dia, SUM(${P}) AS palavras, COUNT(*) AS ditados FROM historico WHERE status='ok' AND ${D} >= date('now','localtime','-364 days') GROUP BY dia ORDER BY dia`).all();
  return { d: tot.d, p: tot.p, ms: tot.ms, porApp: porApp.map((l) => ({ ...l })), dias: dias.map((l) => ({ ...l })) };
}

function povoar(db: DatabaseSync) {
  const hoje = new Date();
  const iso = (dias: number, h = 12) => new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - dias, h).toISOString();
  inserir(db, iso(0), { app: "Notas", palavras: 30, ms: 20_000 });
  inserir(db, iso(0, 15), { app: "Notas", palavras: 10, ms: 5_000 });
  inserir(db, iso(1), { app: "Slack", palavras: 50, ms: 30_000 });
  inserir(db, iso(2), { app: null, palavras: 7, ms: 4_000 });
  inserir(db, iso(2), { app: "  ", modo: "pergunte", palavras: 99, ms: 9_000 });
  inserir(db, iso(3), { status: "erro", palavras: 500 });
  inserir(db, iso(400), { app: "Velho", palavras: 5, ms: 1_000 });
}

describe("semeadura", () => {
  it("bate com as consultas antigas do histórico", () => {
    const db = novoBanco();
    povoar(db);
    semearTotais(db);
    const velho = resumoAntigo(db);
    const novo = lerResumo(db, OPCOES);
    assert.equal(novo.ditados, velho.d);
    assert.equal(novo.palavras, velho.p);
    assert.equal(novo.tempoDitadoMin, velho.ms / 60_000);
    assert.deepEqual(novo.porApp, velho.porApp);
    assert.deepEqual(novo.porDia, velho.dias);
  });

  it("pergunte conta ditado mas não palavras nem tempo; erro não conta; app vazio vira Outro", () => {
    const db = novoBanco();
    inserir(db, "2026-10-17T15:00:00.000Z", { modo: "pergunte", app: null, palavras: 99, ms: 9_000 });
    inserir(db, "2026-10-17T15:00:00.000Z", { status: "erro" });
    semearTotais(db);
    const r = lerResumo(db, OPCOES);
    assert.equal(r.ditados, 1);
    assert.equal(r.palavras, 0);
    assert.equal(r.tempoDitadoMin, 0);
    assert.deepEqual(r.porApp, [{ app: "Outro", palavras: 0, ditados: 1 }]);
  });
});

describe("somarDitado", () => {
  it("soma no dia/app e acumula", () => {
    const db = novoBanco();
    const base = { criadoEm: "2026-10-17T15:00:00.000Z", modo: "ditado", palavras: 20, duracaoMs: 6_000, app: "Notas" };
    somarDitado(db, base);
    somarDitado(db, base);
    const r = lerResumo(db, OPCOES);
    assert.equal(r.ditados, 2);
    assert.equal(r.palavras, 40);
    assert.equal(r.tempoDitadoMin, 12_000 / 60_000);
    assert.equal(r.ppmMedia, 200);
    assert.equal(r.diasAtivos, 1);
    assert.equal(r.sequenciaAtual, 1);
  });

  it("dia local: 02:30 UTC pertence ao dia local calculado pelo SQLite (localtime)", () => {
    const db = novoBanco();
    const criadoEm = "2026-10-17T02:30:00.000Z";
    somarDitado(db, { criadoEm, modo: "ditado", palavras: 1, duracaoMs: 1000, app: "X" });
    const esperado = (db.prepare("SELECT date(?, 'localtime') AS d").get(criadoEm) as { d: string }).d;
    const dia = (db.prepare("SELECT dia FROM estatisticas_dia").get() as { dia: string }).dia;
    assert.equal(dia, esperado);
  });

  it("app nulo e app só com espaços caem em '' (Outro)", () => {
    const db = novoBanco();
    const b = { criadoEm: "2026-10-17T15:00:00.000Z", modo: "ditado", palavras: 3, duracaoMs: 1000 };
    somarDitado(db, { ...b, app: null });
    somarDitado(db, { ...b, app: "   " });
    const linhas = db.prepare("SELECT app, ditados FROM estatisticas_dia").all() as { app: string; ditados: number }[];
    assert.deepEqual(linhas.map((l) => ({ ...l })), [{ app: "", ditados: 2 }]);
    assert.equal(lerResumo(db, OPCOES).porApp[0].app, "Outro");
  });

  it("pergunte soma só o ditado", () => {
    const db = novoBanco();
    somarDitado(db, { criadoEm: "2026-10-17T15:00:00.000Z", modo: "pergunte", palavras: 50, duracaoMs: 5000, app: "A" });
    const r = lerResumo(db, OPCOES);
    assert.equal(r.ditados, 1);
    assert.equal(r.palavras, 0);
  });
});

describe("apagar do histórico", () => {
  it("não muda os totais", () => {
    const db = novoBanco();
    povoar(db);
    semearTotais(db);
    const antes = lerResumo(db, OPCOES);
    db.exec("DELETE FROM historico");
    assert.deepEqual(lerResumo(db, OPCOES), antes);
    assert.ok(antes.ditados > 0);
  });
});

describe("ajustarReprocessamento", () => {
  const antes = { criadoEm: "2026-10-17T15:00:00.000Z", modo: "ditado", palavras: 20, duracaoMs: 6_000, app: "Notas", status: "ok" };

  it("ok -> ok soma só a diferença de palavras", () => {
    const db = novoBanco();
    somarDitado(db, antes);
    ajustarReprocessamento(db, antes, 25);
    ajustarReprocessamento(db, { ...antes, palavras: 25 }, 22);
    const r = lerResumo(db, OPCOES);
    assert.equal(r.ditados, 1);
    assert.equal(r.palavras, 22);
  });

  it("erro -> ok conta o ditado inteiro", () => {
    const db = novoBanco();
    ajustarReprocessamento(db, { ...antes, status: "erro", palavras: 0 }, 18);
    const r = lerResumo(db, OPCOES);
    assert.equal(r.ditados, 1);
    assert.equal(r.palavras, 18);
  });
});
