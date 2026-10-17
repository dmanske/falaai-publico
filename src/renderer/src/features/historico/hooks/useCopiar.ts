import { useCallback, useEffect, useRef, useState } from "react";
import { COPIADO_MS } from "../lib/constantes";

/** Copia texto e lembra por um instante qual item acabou de ser copiado ("Copiado!"). */
export function useCopiar() {
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const copiar = useCallback(async (id: string, texto: string) => {
    try {
      await window.ponte.sistema.copiarTexto(texto);
      setCopiadoId(id);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopiadoId(null), COPIADO_MS);
    } catch {
      setCopiadoId(null);
    }
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);
  return { copiadoId, copiar };
}
