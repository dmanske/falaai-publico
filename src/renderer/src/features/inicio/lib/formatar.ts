// Formatação dos números da página Início (pt-BR).

/** 950 → "950"; 20 640 → "20,6K"; 1 250 000 → "1,3M". */
export function formatarPalavras(n: number): string {
  const um = (v: number) => v.toFixed(1).replace(".", ",").replace(/,0$/, "");
  if (n >= 1_000_000) return `${um(n / 1_000_000)}M`;
  if (n >= 1_000) return `${um(n / 1_000)}K`;
  return String(Math.round(n));
}

/** Minutos → horas e minutos inteiros. Menos de 1 min vira 0 (mostrado como "0 min"). */
export function separarHorasMinutos(minutos: number): { h: number; min: number } {
  const total = Math.max(0, Math.round(minutos));
  return { h: Math.floor(total / 60), min: total % 60 };
}
