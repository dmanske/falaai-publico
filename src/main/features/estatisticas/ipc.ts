import { ipcMain } from "electron";
import { CANAIS_ESTATISTICAS } from "@shared/ipc";
import { resumo } from "./index";

export function registrarIpcEstatisticas(): void {
  ipcMain.handle(CANAIS_ESTATISTICAS.RESUMO, () => resumo());
}
