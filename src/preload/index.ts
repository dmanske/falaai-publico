// Ponte segura entre as telas e o processo principal. As telas só enxergam window.ponte.
// Cada módulo monta sua parte em preload/modulos/; o contrato está em src/shared/ipc/.
import { contextBridge } from "electron";
import type { Ponte } from "@shared/ipc";
import { ponteChaves, ponteIa, pontePermissoes, pontePreferencias, ponteSistema } from "./modulos/basicos";
import { ponteDicionario, ponteEstatisticas, ponteHistorico } from "./modulos/dados";
import { ponteJanelas, pontePilula } from "./modulos/janelas";

const ponte: Ponte = {
  plataforma: process.platform,
  chaves: ponteChaves,
  preferencias: pontePreferencias,
  ia: ponteIa,
  permissoes: pontePermissoes,
  pilula: pontePilula,
  historico: ponteHistorico,
  estatisticas: ponteEstatisticas,
  dicionario: ponteDicionario,
  janelas: ponteJanelas,
  sistema: ponteSistema,
};

contextBridge.exposeInMainWorld("ponte", ponte);
