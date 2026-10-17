// Totais permanentes de estatísticas (tabela estatisticas_dia). Funções puras: recebem o DatabaseSync,
// sem Electron, para poderem ser testadas com banco em memória.
// A tabela NUNCA é mexida pelas rotinas de apagar histórico: apagar ditados não diminui os números.
import type { DatabaseSync } from "node:sqlite";
import type { ResumoEstatisticas } from "../../../../shared/ipc/estatisticas.ts";
import { maiorSequencia, sequenciaAtual } from "./sequencias.ts";

/** Dia no fuso local a partir de um criado_em (ISO UTC). */
export const DIA_LOCAL = "date(criado_em, 'localtime')";
// No modo "pergunte" o texto guardado é a RESPOSTA da IA, não o que a pessoa falou: não conta como
// palavras ditadas nem como tempo de ditado (senão o PPM sobe sem sentido). Conta como dia ativo e ditado.
const PALAVRAS = "CASE WHEN modo = 'pergunte' THEN 0 ELSE palavras END";
const DURACAO = "CASE WHEN modo = 'pergunte' THEN 0 ELSE duracao_ms END";

/** Nome mostrado quando o ditado não tem app. */
const APP_SEM_NOME = "Outro";

export const SQL_CRIAR_TOTAIS = `CREATE TABLE IF NOT EXISTS estatisticas_dia (
  dia TEXT NOT NULL,
  app TEXT NOT NULL DEFAULT '',
  ditados INTEGER NOT NULL DEFAULT 0,
  palavras INTEGER NOT NULL DEFAULT 0,
  duracao_ms INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (dia, app)
);`;

/** Preenche os totais com o que existe hoje no histórico (só status ok). Roda uma vez, na migração. */
export const SQL_SEMEAR_TOTAIS = `INSERT INTO estatisticas_dia (dia, app, ditados, palavras, duracao_ms)
  SELECT ${DIA_LOCAL}, COALESCE(TRIM(app), ''), COUNT(*), COALESCE(SUM(${PALAVRAS}), 0), COALESCE(SUM(${DURACAO}), 0)
  FROM historico WHERE status = 'ok' GROUP BY 1, 2
  ON CONFLICT(dia, app) DO UPDATE SET ditados = ditados + excluded.ditados,
    palavras = palavras + excluded.palavras, duracao_ms = duracao_ms + excluded.duracao_ms;`;

export function semearTotais(db: DatabaseSync): void {
  db.exec(SQL_SEMEAR_TOTAIS);
}

export interface DadosDitado {
  /** ISO UTC, o mesmo valor gravado em historico.criado_em. */
  criadoEm: string;
  modo: string;
  palavras: number;
  duracaoMs: number;
  app: string | null;
}

/** Soma um ditado (status ok) nos totais do dia/app. Mesmos critérios das consultas antigas. */
export function somarDitado(db: DatabaseSync, d: DadosDitado, ditados = 1): void {
  somar(db, d, ditados, d.modo === "pergunte" ? 0 : d.palavras, d.modo === "pergunte" ? 0 : d.duracaoMs);
}

function somar(db: DatabaseSync, d: DadosDitado, ditados: number, palavras: number, duracaoMs: number): void {
  db.prepare(
    `INSERT INTO estatisticas_dia (dia, app, ditados, palavras, duracao_ms)
     VALUES (date(:criado_em, 'localtime'), :app, :ditados, :palavras, :duracao)
     ON CONFLICT(dia, app) DO UPDATE SET ditados = ditados + excluded.ditados,
       palavras = palavras + excluded.palavras, duracao_ms = duracao_ms + excluded.duracao_ms`,
  ).run({
    criado_em: d.criadoEm,
    app: (d.app ?? "").trim(),
    ditados,
    palavras,
    duracao: Math.round(duracaoMs),
  });
}

/**
 * Reprocessar um ditado muda o texto e, por isso, a contagem de palavras. Ajusta a diferença nos totais
 * do dia/app do item. Se ele estava com erro e agora virou ok, conta o ditado inteiro (nunca foi somado).
 * Se estava ok, só soma a diferença de palavras (a duração não muda).
 */
export function ajustarReprocessamento(
  db: DatabaseSync,
  antes: DadosDitado & { status: string },
  palavrasDepois: number,
): void {
  if (antes.status !== "ok") {
    somarDitado(db, { ...antes, palavras: palavrasDepois });
    return;
  }
  if (antes.modo === "pergunte") return;
  const delta = palavrasDepois - antes.palavras;
  if (delta !== 0) somar(db, antes, 0, delta, 0);
}

/** Resumo mostrado no Início, lido só dos totais permanentes. */
export function lerResumo(db: DatabaseSync, opcoes: { velocidadePpm: number; hoje: string }): ResumoEstatisticas {
  const tot = db
    .prepare(
      "SELECT COALESCE(SUM(ditados),0) AS ditados, COALESCE(SUM(palavras),0) AS palavras, COALESCE(SUM(duracao_ms),0) AS ms FROM estatisticas_dia",
    )
    .get() as { ditados: number; palavras: number; ms: number };

  const tempoDitadoMin = tot.ms / 60_000;
  const ppmMedia = tempoDitadoMin > 0 ? Math.round(tot.palavras / tempoDitadoMin) : 0;
  const tempoEconomizadoMin = Math.max(0, Math.round(tot.palavras / opcoes.velocidadePpm - tempoDitadoMin));

  const todos = (
    db.prepare("SELECT dia FROM estatisticas_dia GROUP BY dia ORDER BY dia").all() as { dia: string }[]
  ).map((l) => l.dia);

  const porDia = (
    db
      .prepare(
        `SELECT dia, SUM(palavras) AS palavras, SUM(ditados) AS ditados FROM estatisticas_dia
         WHERE dia >= date('now', 'localtime', '-364 days')
         GROUP BY dia ORDER BY dia`,
      )
      .all() as { dia: string; palavras: number; ditados: number }[]
  ).map((l) => ({ dia: l.dia, palavras: l.palavras, ditados: l.ditados }));

  const porApp = (
    db
      .prepare(
        `SELECT COALESCE(NULLIF(app, ''), '${APP_SEM_NOME}') AS app, SUM(palavras) AS palavras, SUM(ditados) AS ditados
         FROM estatisticas_dia GROUP BY 1 ORDER BY palavras DESC, ditados DESC, app LIMIT 10`,
      )
      .all() as { app: string; palavras: number; ditados: number }[]
  ).map((l) => ({ app: l.app, palavras: l.palavras, ditados: l.ditados }));

  return {
    palavras: tot.palavras,
    tempoEconomizadoMin,
    ppmMedia,
    tempoDitadoMin,
    ditados: tot.ditados,
    diasAtivos: todos.length,
    sequenciaAtual: sequenciaAtual(todos, opcoes.hoje),
    maiorSequencia: maiorSequencia(todos),
    porDia,
    porApp,
  };
}
