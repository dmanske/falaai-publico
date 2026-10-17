// Ponte dos módulos de configuração: chaves, preferências, IA, permissões e sistema.
import {
  CANAIS_CHAVES,
  CANAIS_IA,
  CANAIS_PERMISSOES,
  CANAIS_PREFERENCIAS,
  CANAIS_SISTEMA,
  type PonteChaves,
  type PonteIa,
  type PontePermissoes,
  type PontePreferencias,
  type PonteSistema,
} from "@shared/ipc";
import { invocar, ouvir } from "../lib";

export const ponteChaves: PonteChaves = {
  status: (nome) => invocar(CANAIS_CHAVES.STATUS, nome),
  salvar: (nome, valor) => invocar(CANAIS_CHAVES.SALVAR, nome, valor),
  apagar: (nome) => invocar(CANAIS_CHAVES.APAGAR, nome),
};

export const pontePreferencias: PontePreferencias = {
  ler: () => invocar(CANAIS_PREFERENCIAS.LER),
  salvar: (parcial) => invocar(CANAIS_PREFERENCIAS.SALVAR, parcial),
  aoMudar: (cb) => ouvir(CANAIS_PREFERENCIAS.MUDOU, cb),
};

export const ponteIa: PonteIa = {
  testar: () => invocar(CANAIS_IA.TESTAR),
};

export const pontePermissoes: PontePermissoes = {
  ler: () => invocar(CANAIS_PERMISSOES.LER),
  pedir: (qual) => invocar(CANAIS_PERMISSOES.PEDIR, qual),
};

export const ponteSistema: PonteSistema = {
  info: () => invocar(CANAIS_SISTEMA.INFO),
  verificarAtualizacao: () => invocar(CANAIS_SISTEMA.VERIFICAR_ATUALIZACAO),
  abrirLink: (url) => invocar(CANAIS_SISTEMA.ABRIR_LINK, url),
};
