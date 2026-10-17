export const CANAIS_ESTATISTICAS = {
  RESUMO: "estatisticas:resumo",
} as const;

export interface ResumoEstatisticas {
  palavras: number;
  /** Tempo que levaria digitando (VELOCIDADE_DIGITACAO_PPM) menos o tempo ditando, em minutos. */
  tempoEconomizadoMin: number;
  /** Palavras por minuto ditando (média ponderada). */
  ppmMedia: number;
  tempoDitadoMin: number;
  ditados: number;
  diasAtivos: number;
  sequenciaAtual: number;
  maiorSequencia: number;
  /** Últimos 365 dias com uso (dias sem uso não vêm). dia = "AAAA-MM-DD" no fuso local. */
  porDia: { dia: string; palavras: number; ditados: number }[];
  /** Apps mais usados (nome do app), do maior para o menor. */
  porApp: { app: string; palavras: number; ditados: number }[];
}

export interface PonteEstatisticas {
  resumo(): Promise<ResumoEstatisticas>;
}
