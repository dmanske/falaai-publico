// Decide se, depois de colar, vale avisar "Não achei um campo de texto aqui" e oferecer Copiar.
import {
  APPS_INSERCAO_MELHOR_ESFORCO,
  APPS_SEM_LIGAR_ACESSIBILIDADE,
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
  // Editores de código: o auxiliar não liga a acessibilidade neles, então o campo nunca é lido
  // (20/10/2026: no Kiro o aviso aparecia em todo ditado). O Typeless liga em todos e por isso enxerga.
  if (appId && APPS_SEM_LIGAR_ACESSIBILIDADE.includes(appId)) return false;
  if (appId && (APPS_SEMPRE_GRAVAVEIS.includes(appId) || APPS_INSERCAO_MELHOR_ESFORCO.includes(appId))) return false;
  if (url && [...URLS_SEMPRE_GRAVAVEIS, ...URLS_INSERCAO_MELHOR_ESFORCO].some((prefixo) => url.startsWith(prefixo))) return false;
  return true;
}
