import { useEffect } from "react";
import type { Tema } from "@shared/ipc";

/**
 * Aplica a classe "dark" no <html> conforme a preferência (e acompanha mudanças).
 * `forcarClaro`: a tela de boas-vindas é sempre clara (o papel de parede é claro).
 */
export function useTema(forcarClaro = false): void {
  useEffect(() => {
    let tema: Tema = "sistema";
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const aplicar = () => {
      const escuro = !forcarClaro && (tema === "escuro" || (tema === "sistema" && mq.matches));
      document.documentElement.classList.toggle("dark", escuro);
    };
    void window.ponte.preferencias.ler().then((p) => {
      tema = p.tema;
      aplicar();
    });
    const sair = window.ponte.preferencias.aoMudar((p) => {
      tema = p.tema;
      aplicar();
    });
    mq.addEventListener("change", aplicar);
    return () => {
      sair();
      mq.removeEventListener("change", aplicar);
    };
  }, [forcarClaro]);
}
