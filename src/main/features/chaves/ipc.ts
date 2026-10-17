import { ipcMain } from "electron";
import { CANAIS_CHAVES, type NomeChave } from "@shared/ipc";
import { apagarChave, salvarChave, statusChave } from "./index";

export function registrarIpcChaves(): void {
  ipcMain.handle(CANAIS_CHAVES.STATUS, (_e, nome: NomeChave) => statusChave(nome));
  ipcMain.handle(CANAIS_CHAVES.SALVAR, (_e, nome: NomeChave, valor: string) => salvarChave(nome, String(valor ?? "")));
  ipcMain.handle(CANAIS_CHAVES.APAGAR, (_e, nome: NomeChave) => apagarChave(nome));
}
