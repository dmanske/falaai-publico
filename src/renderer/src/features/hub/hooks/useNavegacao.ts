import { useCallback, useEffect, useState } from "react";
import type { PaginaHub } from "@shared/ipc";
import { apiJanelas } from "../api/ponte";
import type { Destino } from "../types";

const PAGINAS: PaginaHub[] = ["inicio", "historico", "dicionario", "configuracoes"];

/** Lê "#pagina" ou "#pagina:secao" (a janela abre assim; ver src/main/janelas/hub.ts). */
function lerHash(): Destino | null {
  const [pagina, secao] = window.location.hash.replace(/^#/, "").split(":");
  if (!PAGINAS.includes(pagina as PaginaHub)) return null;
  return { pagina: pagina as PaginaHub, secao: secao || null };
}

/** Página atual do hub: estado local + pedidos do processo principal (bandeja, hash da URL). */
export function useNavegacao() {
  const [destino, setDestino] = useState<Destino>(() => lerHash() ?? { pagina: "inicio", secao: null });

  useEffect(() => {
    const cancelar = apiJanelas.aoNavegar((pagina) => setDestino({ pagina, secao: null }));
    const aoHash = () => {
      const d = lerHash();
      if (d) setDestino(d);
    };
    window.addEventListener("hashchange", aoHash);
    return () => {
      cancelar();
      window.removeEventListener("hashchange", aoHash);
    };
  }, []);

  const ir = useCallback((pagina: PaginaHub, secao: string | null = null) => setDestino({ pagina, secao }), []);
  return { destino, ir };
}
