// Parte pura da animação de números (sem React nem DOM, para poder testar com node --test).
// Referência: o Typeless usa easeOutCubic (1 - (1-t)^3) em 250 ms, só nos números da tela Início.

/** Duração padrão da contagem, em ms. Mesmo valor do Typeless; para contar mais devagar, aumente aqui. */
export const DURACAO_NUMERO_MS = 250;

/** Curva de saída suave: começa rápido e desacelera até o valor final. t em [0, 1]. */
export function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - x, 3);
}

/**
 * Valor inteiro mostrado no instante `decorridoMs` de uma animação de `inicio` até `fim`.
 * Em `duracaoMs` (ou depois) devolve exatamente `fim`; com duração <= 0 também.
 */
export function valorNoInstante(inicio: number, fim: number, decorridoMs: number, duracaoMs: number = DURACAO_NUMERO_MS): number {
  if (duracaoMs <= 0 || decorridoMs >= duracaoMs) return Math.round(fim);
  const t = Math.max(0, decorridoMs) / duracaoMs;
  return Math.round(inicio + (fim - inicio) * easeOutCubic(t));
}
