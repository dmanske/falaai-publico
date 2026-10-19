// Decide se, depois de colar, vale avisar "Não achei um campo de texto aqui" e oferecer Copiar.
import {
  APPS_INSERCAO_MELHOR_ESFORCO,
  APPS_SEMPRE_GRAVAVEIS,
  URLS_INSERCAO_MELHOR_ESFORCO,
  URLS_SEMPRE_GRAVAVEIS,
} from "../../../../shared/config.ts";

/** Só o que interessa do contexto lido pelo auxiliar (sem depender do tipo completo). */
export interface ContextoCampo {
  campo: { editavel?: boolean } | null;
  /** v4: a árvore de acessibilidade acabou de ser ligada, então esta leitura não vale. */
  acessibilidadeLigada?: boolean;
}

export function deveAvisarCampoNaoEditavel(ctx: ContextoCampo | null, appId: string | null, url: string | null): boolean {
  if (!ctx) return false;
  // App que acabou de ter a acessibilidade ligada: o "sem campo" é só porque a árvore ainda não existia.
  if (ctx.acessibilidadeLigada === true) return false;
  // Só avisa quando o auxiliar não achou campo, ou disse claramente que ele não é editável.
  if (ctx.campo !== null && ctx.campo.editavel !== false) return false;
  if (appId && (APPS_SEMPRE_GRAVAVEIS.includes(appId) || APPS_INSERCAO_MELHOR_ESFORCO.includes(appId))) return false;
  if (url && [...URLS_SEMPRE_GRAVAVEIS, ...URLS_INSERCAO_MELHOR_ESFORCO].some((prefixo) => url.startsWith(prefixo))) return false;
  return true;
}
