// Igual ao Numero comum, mas para durações: "10 hr 54 min".
import { separarHorasMinutos } from "../lib/formatar";

export function NumeroTempo({ minutos, legenda }: { minutos: number; legenda: string }) {
  const { h, min } = separarHorasMinutos(minutos);
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
