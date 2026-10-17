import { useCallback } from "react";
import type { Preferencias } from "@shared/ipc";
import { modeloPadrao, type IdProvedor } from "@shared/provedores";

/** Provedor e modelo escolhidos; cada provedor lembra o seu modelo. */
export function useProvedor(preferencias: Preferencias, salvar: (p: Partial<Preferencias>) => Promise<void>) {
  const provedor = preferencias.provedor;
  const modelo = preferencias.modeloPorProvedor[provedor] ?? modeloPadrao(provedor);

  const escolherProvedor = useCallback(
    (id: IdProvedor) => {
      if (id === provedor) return;
      void salvar({ provedor: id, modelo: preferencias.modeloPorProvedor[id] ?? modeloPadrao(id) });
    },
    [provedor, preferencias.modeloPorProvedor, salvar],
  );

  const escolherModelo = useCallback(
    (id: string) => {
      void salvar({ modelo: id, modeloPorProvedor: { ...preferencias.modeloPorProvedor, [provedor]: id } });
    },
    [provedor, preferencias.modeloPorProvedor, salvar],
  );

  return { provedor, modelo, escolherProvedor, escolherModelo };
}
