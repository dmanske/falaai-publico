// Decide se o "pergunte" deve simular Cmd+C para pegar a seleção (quando a Acessibilidade não leu o campo).
import { APPS_COPIAM_LINHA_SEM_SELECAO, PREFIXOS_COPIAM_LINHA_SEM_SELECAO } from "../../../../shared/config.ts";

/** Só o que interessa do contexto lido pelo auxiliar. */
export interface ContextoLeitura {
  app?: { appId: string | null } | null;
  campo: { leitura?: "valor" | "marcador" | "nenhuma" } | null;
}

/** Nesses apps Cmd+C sem seleção copia a linha inteira: nunca simular a cópia. */
export function copiaLinhaSemSelecao(appId: string): boolean {
  return APPS_COPIAM_LINHA_SEM_SELECAO.includes(appId) || PREFIXOS_COPIAM_LINHA_SEM_SELECAO.some((p) => appId.startsWith(p));
}

/**
 * Copia só se a Acessibilidade NÃO leu o campo (se leu e a seleção veio vazia, não há seleção de
 * verdade) e o app é conhecido e seguro. Sem contexto ou sem id do app, não arrisca.
 */
export function deveCopiarSelecao(ctx: ContextoLeitura | null, appId: string | null = ctx?.app?.appId ?? null): boolean {
  if (!ctx || !appId) return false;
  if (copiaLinhaSemSelecao(appId)) return false;
  return ctx.campo === null || ctx.campo.leitura === undefined || ctx.campo.leitura === "nenhuma";
}
