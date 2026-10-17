// Contrato entre as telas (renderer) e o processo principal, separado por módulo.
// Cada módulo tem seu arquivo com os nomes de canal, os tipos e a parte da ponte.
// Canal novo: entra no arquivo do módulo; nunca string de canal solta no código.
import type { PonteChaves } from "./chaves";
import type { PonteDicionario } from "./dicionario";
import type { PonteEstatisticas } from "./estatisticas";
import type { PonteHistorico } from "./historico";
import type { PonteIa } from "./ia";
import type { PonteJanelas } from "./janelas";
import type { PontePermissoes } from "./permissoes";
import type { PontePilula } from "./pilula";
import type { PontePreferencias } from "./preferencias";
import type { PonteSistema } from "./sistema";

export * from "./chaves";
export * from "./dicionario";
export * from "./estatisticas";
export * from "./historico";
export * from "./ia";
export * from "./janelas";
export * from "./permissoes";
export * from "./pilula";
export * from "./preferencias";
export * from "./sistema";

/** API exposta pelo preload em window.ponte. */
export interface Ponte {
  /** process.platform: "darwin", "win32"… */
  plataforma: string;
  chaves: PonteChaves;
  preferencias: PontePreferencias;
  ia: PonteIa;
  permissoes: PontePermissoes;
  pilula: PontePilula;
  historico: PonteHistorico;
  estatisticas: PonteEstatisticas;
  dicionario: PonteDicionario;
  janelas: PonteJanelas;
  sistema: PonteSistema;
}
