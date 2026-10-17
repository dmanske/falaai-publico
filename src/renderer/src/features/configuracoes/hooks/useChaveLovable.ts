import { useCallback, useEffect, useState } from "react";
import type { StatusChave } from "@shared/ipc";
import { apiChaves } from "../api/ponte";

/** Status da chave da Lovable e as ações de salvar/apagar. */
export function useChaveLovable() {
  const [status, setStatus] = useState<StatusChave | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    void apiChaves.status("lovable").then(setStatus);
  }, []);

  const salvar = useCallback(async (valor: string) => {
    setErro(null);
    try {
      setStatus(await apiChaves.salvar("lovable", valor));
      return true;
    } catch (e) {
      setErro((e as Error).message);
      return false;
    }
  }, []);

  const apagar = useCallback(async () => {
    setStatus(await apiChaves.apagar("lovable"));
  }, []);

  return { status, erro, salvar, apagar };
}
