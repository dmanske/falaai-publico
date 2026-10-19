// Ponte dos módulos de dados: histórico, estatísticas e dicionário.
import {
  CANAIS_DICIONARIO,
  CANAIS_ESTATISTICAS,
  CANAIS_HISTORICO,
  type PonteDicionario,
  type PonteEstatisticas,
  type PonteHistorico,
} from "@shared/ipc";
import { invocar, ouvir } from "../lib";

export const ponteHistorico: PonteHistorico = {
  listar: (filtro) => invocar(CANAIS_HISTORICO.LISTAR, filtro),
  apagar: (id) => invocar(CANAIS_HISTORICO.APAGAR, id),
  apagarTudo: () => invocar(CANAIS_HISTORICO.APAGAR_TUDO),
  reprocessar: (id) => invocar(CANAIS_HISTORICO.REPROCESSAR, id),
  audio: (id) => invocar(CANAIS_HISTORICO.AUDIO, id),
  salvarAudio: (id) => invocar(CANAIS_HISTORICO.SALVAR_AUDIO, id),
  aoMudar: (cb) => ouvir(CANAIS_HISTORICO.MUDOU, cb),
};

export const ponteEstatisticas: PonteEstatisticas = {
  resumo: () => invocar(CANAIS_ESTATISTICAS.RESUMO),
};

export const ponteDicionario: PonteDicionario = {
  listar: (busca) => invocar(CANAIS_DICIONARIO.LISTAR, busca),
  adicionar: (termo) => invocar(CANAIS_DICIONARIO.ADICIONAR, termo),
  atualizar: (id, termo) => invocar(CANAIS_DICIONARIO.ATUALIZAR, id, termo),
  apagar: (ids) => invocar(CANAIS_DICIONARIO.APAGAR, ids),
  importarCsv: (conteudo) => invocar(CANAIS_DICIONARIO.IMPORTAR_CSV, conteudo),
  aoMudar: (cb) => ouvir(CANAIS_DICIONARIO.MUDOU, () => cb()),
};
