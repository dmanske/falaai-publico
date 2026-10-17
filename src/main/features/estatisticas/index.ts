// Estatísticas permanentes: lidas da tabela estatisticas_dia, que NÃO é afetada ao apagar o histórico
// (um item, tudo ou limpeza por retenção). Detalhes em docs/modulos/estatisticas.md.
import type { ResumoEstatisticas } from "@shared/ipc";
import { VELOCIDADE_DIGITACAO_PPM } from "@shared/config";
import { banco, migrar } from "../../lib/banco";
import { hojeLocal } from "./lib/sequencias";
import { lerResumo, SQL_CRIAR_TOTAIS, SQL_SEMEAR_TOTAIS } from "./lib/totais";

// Versão 1: cria a tabela e semeia com o histórico atual (precisa rodar depois de migrar "historico").
const MIGRACOES = [`${SQL_CRIAR_TOTAIS}\n${SQL_SEMEAR_TOTAIS}`];

/** Cria a tabela de totais (e semeia na primeira vez). Chamado depois de iniciarHistorico(). */
export function iniciarEstatisticas(): void {
  migrar("estatisticas", MIGRACOES);
}

export function resumo(): ResumoEstatisticas {
  return lerResumo(banco(), { velocidadePpm: VELOCIDADE_DIGITACAO_PPM, hoje: hojeLocal() });
}
