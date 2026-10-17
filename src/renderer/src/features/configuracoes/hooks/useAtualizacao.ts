import { useCallback, useState } from "react";
import type { ResultadoAtualizacao } from "@shared/ipc";
import { apiSistema } from "../api/ponte";

export function useAtualizacao() {
  const [verificando, setVerificando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoAtualizacao | null>(null);

  const verificar = useCallback(async () => {
    setVerificando(true);
    try {
      setResultado(await apiSistema.verificarAtualizacao());
    } finally {
      setVerificando(false);
    }
  }, []);

  const abrirLink = useCallback((url: string) => void apiSistema.abrirLink(url), []);
  return { verificando, resultado, verificar, abrirLink };
}
