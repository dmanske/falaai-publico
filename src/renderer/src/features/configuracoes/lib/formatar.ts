// Formatação de preço (US$ por 1 milhão de tokens) e de tamanho de contexto.

/** "US$ 0,075" / "US$ 1,25". */
export function formatarPreco(valor: number): string {
  const casas = valor >= 1 ? 2 : valor >= 0.1 ? 2 : 3;
  const txt = valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: casas });
  return `US$ ${txt}`;
}

/** 1048576 → "1M", 128000 → "128K". */
export function formatarContexto(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}M`;
  if (tokens >= 1000) return `${Math.round(tokens / 1000)}K`;
  return String(tokens);
}

/** ISO → "17/10/2026 14:30". */
export function formatarDataHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
