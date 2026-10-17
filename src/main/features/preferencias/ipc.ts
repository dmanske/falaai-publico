import { BrowserWindow, ipcMain } from "electron";
import { CANAIS_PREFERENCIAS, type Preferencias } from "@shared/ipc";
import { aoMudarPreferencias, lerPreferencias, salvarPreferencias } from "./index";

export function registrarIpcPreferencias(): void {
  ipcMain.handle(CANAIS_PREFERENCIAS.LER, () => lerPreferencias());
  ipcMain.handle(CANAIS_PREFERENCIAS.SALVAR, (_e, parcial: Partial<Preferencias>) => salvarPreferencias(parcial ?? {}));
  // Todas as janelas ficam sabendo (ex.: hub e pílula mudam de tema juntos).
  aoMudarPreferencias((nova) => {
    for (const j of BrowserWindow.getAllWindows()) j.webContents.send(CANAIS_PREFERENCIAS.MUDOU, nova);
  });
}
