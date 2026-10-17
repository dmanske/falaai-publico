import { useEffect, useMemo, useState } from "react";
import type { ItemHistorico } from "@shared/ipc";
import { apiHistorico } from "../api/ponte";
import { montarApps } from "../lib/apps";

/** Apps em que o usuário já ditou (do histórico, lido uma vez), mais os já marcados que não aparecem lá. */
export function useAppsUsados(marcados: string[]) {
  const [itens, setItens] = useState<ItemHistorico[] | null>(null);

  useEffect(() => {
    let vivo = true;
    void apiHistorico
      .listar({ limite: 500 })
      .then((r) => vivo && setItens(r))
      .catch(() => vivo && setItens([]));
    return () => {
      vivo = false;
    };
  }, []);

  // A ordem é calculada só com os marcados da primeira leitura, para a lista não pular ao ligar/desligar.
  const [marcadosIniciais] = useState(marcados);
  const base = useMemo(() => (itens ? montarApps(itens, marcadosIniciais) : null), [itens, marcadosIniciais]);
  return useMemo(() => {
    if (!base) return null;
    const extras = marcados.filter((id) => !base.some((a) => a.appId === id));
    return extras.length ? [...base, ...montarApps([], extras)] : base;
  }, [base, marcados]);
}
