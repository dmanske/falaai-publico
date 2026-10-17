import { useEffect, useState } from "react";
import type { Atalho, IdAtalho } from "@shared/atalhos";
import { apiPreferencias } from "../api/ponte";

/** Atalhos atuais; atualiza quando o usuário muda nas configurações. */
export function useAtalhos() {
  const [atalhos, setAtalhos] = useState<Record<IdAtalho, Atalho> | null>(null);

  useEffect(() => {
    let vivo = true;
    void apiPreferencias.ler().then((p) => vivo && setAtalhos(p.atalhos));
    const cancelar = apiPreferencias.aoMudar((p) => setAtalhos(p.atalhos));
    return () => {
      vivo = false;
      cancelar();
    };
  }, []);

  return atalhos;
}
