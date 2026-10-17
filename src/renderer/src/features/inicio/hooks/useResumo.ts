import { useCallback, useEffect, useState } from "react";
import type { ResumoEstatisticas } from "@shared/ipc";
import { apiEstatisticas, apiHistorico } from "../api/ponte";

/** Resumo das estatísticas; recarrega sozinho quando chega um ditado novo (ou um muda). */
export function useResumo() {
  const [resumo, setResumo] = useState<ResumoEstatisticas | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setResumo(await apiEstatisticas.resumo());
      setErro(null);
    } catch (e) {
      setErro((e as Error).message || "Não consegui carregar as estatísticas.");
    }
  }, []);

  useEffect(() => {
    void carregar();
    let espera: ReturnType<typeof setTimeout> | undefined;
    // Junta vários avisos seguidos (ex.: reprocessar) numa só recarga.
    const cancelar = apiHistorico.aoMudar(() => {
      clearTimeout(espera);
      espera = setTimeout(() => void carregar(), 300);
    });
    return () => {
      clearTimeout(espera);
      cancelar();
    };
  }, [carregar]);

  return { resumo, erro };
}
