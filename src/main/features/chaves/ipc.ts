import { ipcMain } from "electron";
import { CANAIS, type NomeChave } from "@shared/ipc";
import { apagarChave, salvarChave, statusChave } from "./index";

export function registrarIpcChaves(): void {
  ipcMain.handle(CANAIS.CHAVES_STATUS, (_e, nome: NomeChave) => statusChave(nome));
  ipcMain.handle(CANAIS.CHAVES_SALVAR, (_e, nome: NomeChave, valor: string) => salvarChave(nome, String(valor ?? "")));
  ipcMain.handle(CANAIS.CHAVES_APAGAR, (_e, nome: NomeChave) => apagarChave(nome));
}
