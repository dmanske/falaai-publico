// Cálculo das sequências de dias com uso. Funções puras (sem banco, sem Electron).
// Os dias vêm como "AAAA-MM-DD" (fuso local).

const MS_DIA = 86_400_000;

/** "AAAA-MM-DD" → número de dias desde 1970 (sem efeito de fuso/horário de verão). */
function numeroDoDia(dia: string): number {
  const [a, m, d] = dia.split("-").map(Number);
  return Math.round(Date.UTC(a, m - 1, d) / MS_DIA);
}

export function diaAnterior(dia: string): string {
  return new Date((numeroDoDia(dia) - 1) * MS_DIA).toISOString().slice(0, 10);
}

/** Data local de hoje como "AAAA-MM-DD". */
export function hojeLocal(agora = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${agora.getFullYear()}-${p(agora.getMonth() + 1)}-${p(agora.getDate())}`;
}

/**
 * Sequência atual: dias consecutivos terminando hoje; se hoje ainda não teve uso, termina ontem
 * (a sequência só zera quando passa um dia inteiro sem ditar).
 */
export function sequenciaAtual(dias: string[], hoje: string): number {
  const conjunto = new Set(dias);
  let dia = conjunto.has(hoje) ? hoje : diaAnterior(hoje);
  let total = 0;
  while (conjunto.has(dia)) {
    total++;
    dia = diaAnterior(dia);
  }
  return total;
}

/** Maior sequência de dias consecutivos de todo o histórico. */
export function maiorSequencia(dias: string[]): number {
  const nums = [...new Set(dias)].map(numeroDoDia).sort((a, b) => a - b);
  let maior = 0;
  let atual = 0;
  let anterior = -Infinity;
  for (const n of nums) {
    atual = n === anterior + 1 ? atual + 1 : 1;
    if (atual > maior) maior = atual;
    anterior = n;
  }
  return maior;
}
