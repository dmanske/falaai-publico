import { useCallback, useState } from "react";
import type { ResultadoTesteIa } from "@shared/ipc";
import { apiIa } from "../api/ponte";

export function useTesteIa() {
  const [testando, setTestando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoTesteIa | null>(null);

  const testar = useCallback(async () => {
    setTestando(true);
    setResultado(null);
    try {
      const r = await apiIa.testar();
      setResultado(r);
      return r;
    } finally {
      setTestando(false);
    }
  }, []);

  const limpar = useCallback(() => setResultado(null), []);

  return { testando, resultado, testar, limpar };
}
