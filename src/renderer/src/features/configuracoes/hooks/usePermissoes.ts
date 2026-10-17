import { useCallback, useEffect, useState } from "react";
import type { StatusPermissoes } from "@shared/ipc";
import { apiPermissoes } from "../api/ponte";

/** As permissões mudam fora do app (Ajustes do sistema): relê a cada poucos segundos. */
const INTERVALO_MS = 2000;

export function usePermissoes() {
  const [status, setStatus] = useState<StatusPermissoes | null>(null);

  useEffect(() => {
    const ler = () => void apiPermissoes.ler().then(setStatus);
    ler();
    const t = setInterval(ler, INTERVALO_MS);
    return () => clearInterval(t);
  }, []);

  const pedir = useCallback(async (qual: "microfone" | "acessibilidade" | "ajustes-teclado") => {
    setStatus(await apiPermissoes.pedir(qual));
  }, []);

  return { status, pedir };
}
