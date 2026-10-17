import { useCallback, useEffect, useState } from "react";
import type { NomeChave, StatusChave } from "@shared/ipc";
import { apiChaves } from "../api/ponte";

/** Status de uma chave do cofre e as ações de salvar/apagar. `null` = sem chave para mostrar. */
export function useChave(nome: NomeChave | null) {
  const [status, setStatus] = useState<StatusChave | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setStatus(null);
    setErro(null);
    if (!nome) return;
    let vivo = true;
    void apiChaves.status(nome).then((s) => vivo && setStatus(s));
    return () => {
      vivo = false;
    };
  }, [nome]);

  const salvar = useCallback(
    async (valor: string) => {
      if (!nome) return false;
      setErro(null);
      try {
        setStatus(await apiChaves.salvar(nome, valor.trim()));
        return true;
      } catch (e) {
        setErro((e as Error).message);
        return false;
      }
    },
    [nome],
  );

  const apagar = useCallback(async () => {
    if (nome) setStatus(await apiChaves.apagar(nome));
  }, [nome]);

  return { status, erro, salvar, apagar };
}
