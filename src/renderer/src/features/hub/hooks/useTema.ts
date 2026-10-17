import { useEffect } from "react";
import type { Preferencias } from "@shared/ipc";
import { apiPreferencias } from "../api/ponte";

/** Põe/tira a classe "dark" no <html> conforme a preferência ("sistema" segue o macOS/Windows ao vivo). */
export function useTema(): void {
  useEffect(() => {
    const consulta = window.matchMedia("(prefers-color-scheme: dark)");
    let tema: Preferencias["tema"] = "sistema";
    const aplicar = () => {
      const escuro = tema === "escuro" || (tema === "sistema" && consulta.matches);
      document.documentElement.classList.toggle("dark", escuro);
    };
    void apiPreferencias.ler().then((p) => {
      tema = p.tema;
      aplicar();
    });
    const cancelar = apiPreferencias.aoMudar((p) => {
      tema = p.tema;
      aplicar();
    });
    consulta.addEventListener("change", aplicar);
    return () => {
      cancelar();
      consulta.removeEventListener("change", aplicar);
    };
  }, []);
}
