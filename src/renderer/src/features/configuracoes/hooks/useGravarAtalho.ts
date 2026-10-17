import { useCallback, useEffect, useRef, useState } from "react";
import type { Atalho } from "@shared/atalhos";
import { codigoParaTecla, ehModificador } from "../lib/atalhos";
import { plataforma } from "../api/ponte";

/**
 * Captura uma combinação de teclas: segure as teclas e solte tudo; o que foi segurado vira o atalho.
 * Esc cancela. A tecla Fn não chega ao navegador, então não dá para gravá-la.
 */
export function useGravarAtalho(aoTerminar: (atalho: Atalho) => void) {
  const [gravando, setGravando] = useState(false);
  const [atual, setAtual] = useState<Atalho>([]);
  const segurando = useRef(new Set<string>());
  const coletado = useRef<Atalho>([]);
  const callback = useRef(aoTerminar);
  callback.current = aoTerminar;

  const parar = useCallback(() => {
    setGravando(false);
    setAtual([]);
    segurando.current.clear();
    coletado.current = [];
  }, []);

  useEffect(() => {
    if (!gravando) return;
    const aoDescer = (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.code === "Escape") return parar();
      const tecla = codigoParaTecla(e.code, plataforma);
      if (!tecla) return;
      segurando.current.add(e.code);
      if (!coletado.current.includes(tecla)) {
        const nova = [...coletado.current, tecla];
        // Modificadores primeiro, tecla comum por último, no máximo uma.
        const mods = nova.filter(ehModificador);
        const comuns = nova.filter((t) => !ehModificador(t));
        coletado.current = [...mods, ...comuns.slice(0, 1)];
        setAtual(coletado.current);
      }
    };
    const aoSubir = (e: KeyboardEvent) => {
      e.preventDefault();
      segurando.current.delete(e.code);
      if (segurando.current.size === 0 && coletado.current.length > 0) {
        const resultado = coletado.current;
        parar();
        callback.current(resultado);
      }
    };
    window.addEventListener("keydown", aoDescer, true);
    window.addEventListener("keyup", aoSubir, true);
    return () => {
      window.removeEventListener("keydown", aoDescer, true);
      window.removeEventListener("keyup", aoSubir, true);
    };
  }, [gravando, parar]);

  return { gravando, atual, iniciar: () => setGravando(true), parar };
}
