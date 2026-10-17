import { useEffect, useRef, useState } from "react";

/** Peso de cada barra: simétrico, mais alto no meio (o "leque" da voz). */
const ENVELOPE = [0.3, 0.45, 0.6, 0.78, 0.92, 1, 0.92, 0.78, 0.6, 0.45, 0.3];
const ALTURA_MIN = 4;
/** Em silêncio as barras já formam um leque pequeno (o meio fica com ALTURA_MIN + REPOUSO). */
const REPOUSO = 6;
const ALTURA_MAX = 20;

/** Onda simétrica que cresce com o volume da voz; cada barra varia um pouco para parecer viva. */
export function Onda({ nivel, cor = "#ffffff" }: { nivel: number; cor?: string }) {
  const [alturas, setAlturas] = useState(() => ENVELOPE.map((peso) => Math.round(ALTURA_MIN + REPOUSO * peso)));
  const nivelRef = useRef(nivel);
  nivelRef.current = nivel;

  useEffect(() => {
    // ~12 quadros por segundo: suave, sem tremer.
    const t = setInterval(() => {
      const n = Math.min(1, nivelRef.current * 1.6);
      setAlturas(
        ENVELOPE.map((peso) => {
          const variacao = 0.65 + Math.random() * 0.35;
          const repouso = ALTURA_MIN + REPOUSO * peso;
          return Math.round(repouso + (ALTURA_MAX - repouso) * n * peso * variacao);
        }),
      );
    }, 80);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex h-5 items-center gap-[3px]">
      {alturas.map((a, i) => (
        <span
          key={i}
          className="w-[3px] rounded-full transition-[height] duration-100 ease-out"
          style={{ height: `${a}px`, backgroundColor: cor }}
        />
      ))}
    </div>
  );
}
