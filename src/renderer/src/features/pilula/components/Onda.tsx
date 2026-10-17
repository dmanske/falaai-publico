import { useEffect, useState } from "react";

const BARRAS = 18;

/** Barras que andam da direita para a esquerda conforme o volume da voz. */
export function Onda({ nivel }: { nivel: number }) {
  const [historico, setHistorico] = useState<number[]>(() => Array(BARRAS).fill(0));

  useEffect(() => {
    setHistorico((h) => [...h.slice(1), nivel]);
  }, [nivel]);

  return (
    <div className="flex h-6 items-center gap-[3px]">
      {historico.map((n, i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-white/90 transition-[height] duration-75"
          style={{ height: `${Math.max(3, Math.round(n * 24))}px` }}
        />
      ))}
    </div>
  );
}
