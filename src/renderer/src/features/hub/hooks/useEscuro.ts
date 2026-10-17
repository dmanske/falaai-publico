import { useEffect, useState } from "react";

/** Se o hub está no modo escuro agora (acompanha a classe "dark" que o useTema põe no <html>). */
export function useEscuro(): boolean {
  const raiz = document.documentElement;
  const [escuro, setEscuro] = useState(() => raiz.classList.contains("dark"));
  useEffect(() => {
    const observador = new MutationObserver(() => setEscuro(raiz.classList.contains("dark")));
    observador.observe(raiz, { attributes: true, attributeFilter: ["class"] });
    return () => observador.disconnect();
  }, [raiz]);
  return escuro;
}
