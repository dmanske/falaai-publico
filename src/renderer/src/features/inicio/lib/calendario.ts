// Monta a grade do calendário de atividade (estilo GitHub): colunas = semanas (começam no domingo), 7 linhas.
import { CALENDARIO_SEMANAS } from "./constantes";

export interface CelulaDia {
  /** "AAAA-MM-DD" local. */
  dia: string;
  palavras: number;
  ditados: number;
  /** 0 = sem uso; 1 a 4 = intensidade. */
  nivel: 0 | 1 | 2 | 3 | 4;
  /** Dia depois de hoje (não mostrar). */
  futuro: boolean;
}

export interface GradeCalendario {
  /** semanas[coluna][linha], linha 0 = domingo. */
  semanas: CelulaDia[][];
  /** Rótulo de mês na coluna em que o mês muda. */
  meses: { coluna: number; rotulo: string }[];
}

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function chaveDia(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function gerarGrade(
  porDia: { dia: string; palavras: number; ditados: number }[],
  hoje: Date,
  deslocamentoSemanas: number,
  nSemanas = CALENDARIO_SEMANAS,
): GradeCalendario {
  const mapa = new Map(porDia.map((d) => [d.dia, d]));
  const max = Math.max(1, ...porDia.map((d) => d.palavras));
  const chaveHoje = chaveDia(hoje);
  // Domingo da semana mais antiga mostrada.
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - hoje.getDay() - 7 * (deslocamentoSemanas + nSemanas - 1));

  const semanas: CelulaDia[][] = [];
  const meses: { coluna: number; rotulo: string }[] = [];
  let mesAnterior = -1;
  for (let c = 0; c < nSemanas; c++) {
    const coluna: CelulaDia[] = [];
    for (let l = 0; l < 7; l++) {
      const data = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + c * 7 + l);
      const chave = chaveDia(data);
      const d = mapa.get(chave);
      const palavras = d?.palavras ?? 0;
      coluna.push({
        dia: chave,
        palavras,
        ditados: d?.ditados ?? 0,
        nivel: palavras <= 0 ? 0 : (Math.min(4, Math.max(1, Math.ceil((palavras / max) * 4))) as 1 | 2 | 3 | 4),
        futuro: chave > chaveHoje,
      });
      if (l === 0 && data.getMonth() !== mesAnterior) {
        // O rótulo só aparece se o dia 1 (ou os primeiros dias) do mês estiverem nesta coluna ou se for a primeira coluna.
        mesAnterior = data.getMonth();
        meses.push({ coluna: c, rotulo: MESES[data.getMonth()] });
      }
    }
    semanas.push(coluna);
  }
  // A primeira coluna costuma começar no fim de um mês: se a próxima mudança de mês vem logo, o rótulo inicial atrapalha.
  if (meses.length > 1 && meses[1].coluna - meses[0].coluna < 2) meses.shift();
  return { semanas, meses };
}
