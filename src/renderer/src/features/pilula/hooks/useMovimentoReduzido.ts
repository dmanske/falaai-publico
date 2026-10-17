import { useEffect, useState } from "react";

/** Se o sistema pede para reduzir movimento (acessibilidade); acompanha a mudança ao vivo. */
export function useMovimentoReduzido(): boolean {
  const [reduzido, setReduzido] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
    const atualizar = () => setReduzido(consulta.matches);
    consulta.addEventListener("change", atualizar);
    return () => consulta.removeEventListener("change", atualizar);
  }, []);
  return reduzido;
}
