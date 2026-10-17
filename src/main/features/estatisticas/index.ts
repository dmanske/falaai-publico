// Estatísticas calculadas direto do histórico (só ditados com status "ok").
import type { ResumoEstatisticas } from "@shared/ipc";
import { VELOCIDADE_DIGITACAO_PPM } from "@shared/config";
import { banco } from "../../lib/banco";
import { hojeLocal, maiorSequencia, sequenciaAtual } from "./lib/sequencias";

const DIA_LOCAL = "date(criado_em, 'localtime')";
// No modo "pergunte" o texto guardado é a RESPOSTA da IA, não o que a pessoa falou: não conta como
// palavras ditadas nem como tempo de ditado (senão o PPM sobe sem sentido). Conta como dia ativo e ditado.
const PALAVRAS = "CASE WHEN modo = 'pergunte' THEN 0 ELSE palavras END";
const DURACAO = "CASE WHEN modo = 'pergunte' THEN 0 ELSE duracao_ms END";

export function resumo(): ResumoEstatisticas {
  const d = banco();
  const tot = d
    .prepare(
      `SELECT COUNT(*) AS ditados, COALESCE(SUM(${PALAVRAS}),0) AS palavras, COALESCE(SUM(${DURACAO}),0) AS ms FROM historico WHERE status = 'ok'`,
    )
    .get() as { ditados: number; palavras: number; ms: number };

  const tempoDitadoMin = tot.ms / 60_000;
  const ppmMedia = tempoDitadoMin > 0 ? Math.round(tot.palavras / tempoDitadoMin) : 0;
  const tempoEconomizadoMin = Math.max(0, Math.round(tot.palavras / VELOCIDADE_DIGITACAO_PPM - tempoDitadoMin));

  const todos = (
    d.prepare(`SELECT ${DIA_LOCAL} AS dia FROM historico WHERE status = 'ok' GROUP BY dia ORDER BY dia`).all() as { dia: string }[]
  ).map((l) => l.dia);

  const porDia = (
    d
      .prepare(
        `SELECT ${DIA_LOCAL} AS dia, SUM(${PALAVRAS}) AS palavras, COUNT(*) AS ditados FROM historico
         WHERE status = 'ok' AND ${DIA_LOCAL} >= date('now', 'localtime', '-364 days')
         GROUP BY dia ORDER BY dia`,
      )
      .all() as { dia: string; palavras: number; ditados: number }[]
  ).map((l) => ({ dia: l.dia, palavras: l.palavras, ditados: l.ditados }));

  const porApp = (
    d
      .prepare(
        `SELECT COALESCE(NULLIF(TRIM(app), ''), 'Outro') AS app, SUM(${PALAVRAS}) AS palavras, COUNT(*) AS ditados
         FROM historico WHERE status = 'ok' GROUP BY 1 ORDER BY palavras DESC, ditados DESC LIMIT 10`,
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
    sequenciaAtual: sequenciaAtual(todos, hojeLocal()),
    maiorSequencia: maiorSequencia(todos),
    porDia,
    porApp,
  };
}
