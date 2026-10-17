import { useEffect, useState } from "react";
import type { FundoHub } from "@shared/ipc";
import { apiPreferencias } from "../api/ponte";

/** Fundo do hub escolhido nas preferências ("topo" até a leitura terminar). */
export function useFundo(): FundoHub {
  const [fundo, setFundo] = useState<FundoHub>("topo");
  useEffect(() => {
    void apiPreferencias.ler().then((p) => setFundo(p.fundo ?? "topo"));
    return apiPreferencias.aoMudar((p) => setFundo(p.fundo ?? "topo"));
  }, []);
  return fundo;
}
