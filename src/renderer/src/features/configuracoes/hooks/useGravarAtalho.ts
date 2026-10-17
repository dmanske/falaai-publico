import { useCallback, useEffect, useRef, useState } from "react";
import type { Atalho } from "@shared/atalhos";
import { apiAtalhos } from "../api/ponte";

/**
 * Grava um atalho pelo auxiliar nativo: enxerga Fn, lados das teclas e toque duplo, e não deixa o
 * atalho disparar um ditado enquanto grava. Esc (ou Cancelar) desiste.
 */
export function useGravarAtalho(aoTerminar: (atalho: Atalho) => void) {
  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const callback = useRef(aoTerminar);
  callback.current = aoTerminar;
  const ativo = useRef(false);

  const iniciar = useCallback(async () => {
    setErro(null);
    setGravando(true);
    ativo.current = true;
    const r = await apiAtalhos.capturar();
    ativo.current = false;
    setGravando(false);
    if (r.ok) callback.current(r.teclas);
    else if (r.erro !== "Captura cancelada.") setErro(r.erro);
  }, []);

  const parar = useCallback(() => {
    if (ativo.current) void apiAtalhos.cancelarCaptura();
  }, []);

  // Saiu da tela no meio da gravação: cancela para o teclado voltar ao normal.
  useEffect(() => () => {
    if (ativo.current) void apiAtalhos.cancelarCaptura();
  }, []);

  return { gravando, erro, iniciar, parar };
}
