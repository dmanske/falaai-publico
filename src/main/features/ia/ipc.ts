import { ipcMain } from "electron";
import { CANAIS_IA } from "@shared/ipc";
import { testarIa } from "./testeChave";

export function registrarIpcIa(): void {
  ipcMain.handle(CANAIS_IA.TESTAR, () => testarIa());
}
