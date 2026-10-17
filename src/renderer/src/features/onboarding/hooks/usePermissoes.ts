import { useCallback, useEffect, useState } from "react";
import type { PermissaoPedida, StatusPermissoes } from "@shared/ipc";

/** Lê o status das permissões e relê a cada 2 s (a pessoa muda nos Ajustes do sistema). */
export function usePermissoes() {
  const [status, setStatus] = useState<StatusPermissoes | null>(null);
  useEffect(() => {
    let vivo = true;
    const ler = () => void window.ponte.permissoes.ler().then((s) => vivo && setStatus(s)).catch(() => {});
    ler();
    const t = setInterval(ler, 2000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, []);
  const pedir = useCallback(async (qual: PermissaoPedida) => {
    setStatus(await window.ponte.permissoes.pedir(qual));
  }, []);
  return { status, pedir };
}
