import { useEffect, useRef, useState } from "react";
import { DURACAO_NUMERO_MS, valorNoInstante } from "./animacaoNumero";

const MOVIMENTO_REDUZIDO = "(prefers-reduced-motion: reduce)";

function prefereMovimentoReduzido(): boolean {
  return typeof window !== "undefined" && window.matchMedia(MOVIMENTO_REDUZIDO).matches;
}

/**
 * Devolve um inteiro que "conta" até `alvo`: na primeira vez sobe de 0; nas mudanças seguintes
 * anima do valor que estava na tela até o novo. Com prefers-reduced-motion devolve o alvo direto.
 * Quem usa formata o resultado (ex.: formatarPalavras) para o valor final ficar igual ao de sempre.
 */
export function useNumeroAnimado(alvo: number, opcoes: { duracaoMs?: number } = {}): number {
  const { duracaoMs = DURACAO_NUMERO_MS } = opcoes;
  const reduzido = prefereMovimentoReduzido();
  const [valor, setValor] = useState(() => (reduzido ? Math.round(alvo) : 0));
  const naTela = useRef(valor); // último valor mostrado, ponto de partida da próxima animação

  useEffect(() => {
    const fim = Math.round(alvo);
    if (prefereMovimentoReduzido() || naTela.current === fim) {
      naTela.current = fim;
      setValor(fim);
      return;
    }
    const inicio = naTela.current;
    const t0 = performance.now();
    let frame = 0;
    const passo = (agora: number) => {
      const v = valorNoInstante(inicio, fim, agora - t0, duracaoMs);
      naTela.current = v;
      setValor(v);
      if (v !== fim) frame = requestAnimationFrame(passo);
    };
    frame = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(frame);
  }, [alvo, duracaoMs]);

  return valor;
}
