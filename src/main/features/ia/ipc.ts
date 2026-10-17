import { ipcMain } from "electron";
import { CANAIS } from "@shared/ipc";
import { testarIa } from "./testeChave";

export function registrarIpcIa(): void {
  ipcMain.handle(CANAIS.IA_TESTAR, () => testarIa());
}
