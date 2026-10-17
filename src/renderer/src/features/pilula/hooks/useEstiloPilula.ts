import { useEffect, useState } from "react";
import type { EstiloPilula } from "@shared/ipc";
import { ESTILO_PILULA_PADRAO } from "@shared/temas/estilosPilula";
import { apiPreferencias } from "../api/ponte";

/** Estilo escolhido em Configurações > Pílula; acompanha as mudanças ao vivo. */
export function useEstiloPilula(): EstiloPilula {
  const [estilo, setEstilo] = useState<EstiloPilula>(ESTILO_PILULA_PADRAO);
  useEffect(() => {
    void apiPreferencias.ler().then((p) => setEstilo(p.estiloPilula));
    return apiPreferencias.aoMudar((p) => setEstilo(p.estiloPilula));
  }, []);
  return estilo;
}
