import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useMovimentoReduzido } from "../hooks/useMovimentoReduzido";

/** Peso de cada barra: simétrico, mais alto no meio (o "leque" da voz). */
const ENVELOPE = [0.3, 0.45, 0.6, 0.78, 0.92, 1, 0.92, 0.78, 0.6, 0.45, 0.3];
const ALTURA_MIN = 4;
/** Em silêncio as barras já formam um leque pequeno (o meio fica com ALTURA_MIN + REPOUSO). */
const REPOUSO = 6;
const ALTURA_MAX = 20;
/** Altura das barras na prévia parada (miniaturas em Configurações). */
const PARADA = ENVELOPE.map((peso) => Math.round(ALTURA_MIN + (ALTURA_MAX - ALTURA_MIN) * peso));

/**
 * Onda simétrica que cresce com o volume da voz; cada barra varia um pouco para parecer viva.
 * As cores vêm do estilo (variáveis --pil-barra-*); `cor` só é usada para indicar o modo no estilo original.
 * `parada`: prévia sem animação. Com "reduzir movimento" a onda segue o volume, mas sem o tremor aleatório.
 */
export function Onda({ nivel, cor, parada = false }: { nivel: number; cor?: string; parada?: boolean }) {
  const reduzido = useMovimentoReduzido();
  const [alturas, setAlturas] = useState(() => ENVELOPE.map((peso) => Math.round(ALTURA_MIN + REPOUSO * peso)));
  const nivelRef = useRef(nivel);
  nivelRef.current = nivel;

  useEffect(() => {
    if (parada) return;
    // ~12 quadros por segundo: suave, sem tremer.
    const t = setInterval(() => {
      const n = Math.min(1, nivelRef.current * 1.6);
      setAlturas(
        ENVELOPE.map((peso) => {
          const variacao = reduzido ? 0.8 : 0.65 + Math.random() * 0.35;
          const repouso = ALTURA_MIN + REPOUSO * peso;
          return Math.round(repouso + (ALTURA_MAX - repouso) * n * peso * variacao);
        }),
      );
    }, 80);
    return () => clearInterval(t);
  }, [parada, reduzido]);

  const estilo = cor ? ({ "--pil-barra-a": cor, "--pil-barra-b": cor } as CSSProperties) : undefined;
  return (
    <div className="pil-onda" style={estilo}>
      {(parada ? PARADA : alturas).map((a, i) => (
        <span key={i} className="pil-barra" style={{ height: `${a}px` }} />
      ))}
    </div>
  );
}
