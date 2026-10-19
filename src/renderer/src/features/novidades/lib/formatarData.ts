const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "2026-10-18" → "18 de outubro de 2026". Texto fora do formato volta como veio. */
export function dataPorExtenso(data: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  if (!m) return data;
  const mes = MESES[Number(m[2]) - 1];
  if (!mes) return data;
  return `${Number(m[3])} de ${mes} de ${m[1]}`;
}
