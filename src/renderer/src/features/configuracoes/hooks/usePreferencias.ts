import { useCallback, useEffect, useState } from "react";
import type { Preferencias } from "@shared/ipc";
import { apiPreferencias } from "../api/ponte";

export function usePreferencias() {
  const [preferencias, setPreferencias] = useState<Preferencias | null>(null);

  useEffect(() => {
    void apiPreferencias.ler().then(setPreferencias);
  }, []);

  const salvar = useCallback(async (parcial: Partial<Preferencias>) => {
    setPreferencias(await apiPreferencias.salvar(parcial));
  }, []);

  /** Relê do disco (o teste da chave grava o formato de áudio descoberto). */
  const recarregar = useCallback(async () => {
    setPreferencias(await apiPreferencias.ler());
  }, []);

  return { preferencias, salvar, recarregar };
}
