import { useCallback, useEffect, useRef, useState } from "react";
import type { ListaOpenRouter } from "@shared/ipc";
import { apiIa } from "../api/ponte";

/**
 * Lista de modelos do OpenRouter. Busca sempre com `todos: true` (inclui os só de texto) e filtra na
 * tela pelo interruptor — assim sempre dá para saber se o modelo salvo ouve áudio.
 */
export function useModelosOpenRouter(ativo: boolean) {
  const [lista, setLista] = useState<ListaOpenRouter | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [mostrarTexto, setMostrarTexto] = useState(false);
  const pedido = useRef(0);

  const carregar = useCallback(async (recarregar: boolean) => {
    const meu = ++pedido.current;
    setCarregando(true);
    try {
      const r = await apiIa.modelosOpenRouter({ todos: true, recarregar });
      if (meu === pedido.current) setLista(r);
    } catch (e) {
      if (meu === pedido.current) setLista({ modelos: [], atualizadoEm: new Date().toISOString(), erro: (e as Error).message });
    } finally {
      if (meu === pedido.current) setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (ativo && !lista) void carregar(false);
  }, [ativo, lista, carregar]);

  const atualizar = useCallback(() => carregar(true), [carregar]);

  return { lista, carregando, mostrarTexto, setMostrarTexto, atualizar };
}
