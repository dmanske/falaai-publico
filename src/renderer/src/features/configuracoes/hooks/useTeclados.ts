import { useEffect, useState } from "react";
import type { TecladoConectado } from "@shared/ipc";
import { apiSistema } from "../api/ponte";

/** Teclados conectados (só Mac); null no Windows ou se falhar. */
export function useTeclados(): TecladoConectado[] | null {
  const [lista, setLista] = useState<TecladoConectado[] | null>(null);

  useEffect(() => {
    let vivo = true;
    apiSistema
      .teclados()
      .then((t) => vivo && setLista(t))
      .catch(() => vivo && setLista(null));
    return () => {
      vivo = false;
    };
  }, []);

  return lista;
}
