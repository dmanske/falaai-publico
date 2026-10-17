// Igual ao Numero comum, mas para durações: "10 hr 54 min".
import { useNumeroAnimado } from "@/hooks/useNumeroAnimado";
import { separarHorasMinutos } from "../lib/formatar";

export function NumeroTempo({ minutos, legenda }: { minutos: number; legenda: string }) {
  // Anima os minutos totais e separa em h/min a cada passo (mesma conta do valor final).
  const { h, min } = separarHorasMinutos(useNumeroAnimado(minutos));
  return (
    <div>
      <div className="flex items-baseline gap-1.5">
        {h > 0 && (
          <>
            <span className="text-4xl font-bold tracking-tight">{h}</span>
            <span className="mr-1 text-base font-semibold">h</span>
          </>
        )}
        <span className="text-4xl font-bold tracking-tight">{min}</span>
        <span className="text-base font-semibold">min</span>
      </div>
      <div className="mt-1 text-base text-suave">{legenda}</div>
    </div>
  );
}
