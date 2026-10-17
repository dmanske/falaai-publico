import { useCallback, useEffect, useRef, useState } from "react";
import type { ItemHistorico } from "@shared/ipc";
import { apiHistorico } from "../api/ponte";
import { ESPERA_BUSCA_MS, ITENS_POR_PAGINA } from "../lib/constantes";

function combinaComBusca(item: ItemHistorico, busca: string): boolean {
  const b = busca.trim().toLowerCase();
  return !b || item.texto.toLowerCase().includes(b) || (item.app ?? "").toLowerCase().includes(b);
}

/** Lista paginada do histórico, com busca e atualização ao vivo. */
export function useHistorico(busca: string) {
  const [itens, setItens] = useState<ItemHistorico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [temMais, setTemMais] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Descarta respostas de buscas antigas que chegam atrasadas.
  const requisicao = useRef(0);
  const buscaRef = useRef(busca);
  buscaRef.current = busca;

  const recarregar = useCallback(async (termo: string) => {
    const minha = ++requisicao.current;
    setCarregando(true);
    try {
      const lista = await apiHistorico.listar({ busca: termo, limite: ITENS_POR_PAGINA });
      if (minha !== requisicao.current) return;
      setItens(lista);
      setTemMais(lista.length === ITENS_POR_PAGINA);
      setErro(null);
    } catch (e) {
      if (minha === requisicao.current) setErro((e as Error).message || "Não consegui carregar o histórico.");
    } finally {
      if (minha === requisicao.current) setCarregando(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void recarregar(busca), busca ? ESPERA_BUSCA_MS : 0);
    return () => clearTimeout(t);
  }, [busca, recarregar]);

  const carregarMais = useCallback(async () => {
    const ultimo = itens[itens.length - 1];
    if (!ultimo) return;
    const minha = requisicao.current;
    setCarregando(true);
    try {
      const lista = await apiHistorico.listar({ busca: buscaRef.current, antesDe: ultimo.criadoEm, limite: ITENS_POR_PAGINA });
      if (minha !== requisicao.current) return;
      setItens((atual) => [...atual, ...lista.filter((n) => !atual.some((a) => a.id === n.id))]);
      setTemMais(lista.length === ITENS_POR_PAGINA);
    } catch (e) {
      setErro((e as Error).message || "Não consegui carregar mais.");
    } finally {
      setCarregando(false);
    }
  }, [itens]);

  /** Insere (se combina com a busca) ou atualiza um item. */
  const aplicar = useCallback((item: ItemHistorico) => {
    setItens((atual) => {
      if (atual.some((i) => i.id === item.id)) return atual.map((i) => (i.id === item.id ? item : i));
      return combinaComBusca(item, buscaRef.current) ? [item, ...atual] : atual;
    });
  }, []);

  const remover = useCallback((id: string) => setItens((atual) => atual.filter((i) => i.id !== id)), []);
  const limpar = useCallback(() => {
    setItens([]);
    setTemMais(false);
  }, []);

  // Ao vivo: ditado novo ou item reprocessado.
  useEffect(() => apiHistorico.aoMudar(aplicar), [aplicar]);

  return { itens, carregando, temMais, erro, carregarMais, aplicar, remover, limpar };
}
