import { useCallback, useEffect, useState } from "react";
import type { PalavraDicionario } from "@shared/ipc";
import { apiDicionario } from "../api/ponte";

/** Lista de palavras com busca; atualiza sozinha quando o dicionário muda (inclusive por aprendizado). */
export function useDicionario() {
  const [palavras, setPalavras] = useState<PalavraDicionario[]>([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    try {
      setPalavras(await apiDicionario.listar(busca.trim() || undefined));
    } catch {
      setPalavras([]);
    } finally {
      setCarregando(false);
    }
  }, [busca]);

  useEffect(() => {
    void recarregar();
    return apiDicionario.aoMudar(() => void recarregar());
  }, [recarregar]);

  return { palavras, busca, setBusca, carregando };
}
