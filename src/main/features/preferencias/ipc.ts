import { ipcMain } from "electron";
import { CANAIS, type Preferencias } from "@shared/ipc";
import { lerPreferencias, salvarPreferencias } from "./index";

export function registrarIpcPreferencias(): void {
  ipcMain.handle(CANAIS.PREFERENCIAS_LER, () => lerPreferencias());
  ipcMain.handle(CANAIS.PREFERENCIAS_SALVAR, (_e, parcial: Partial<Preferencias>) => salvarPreferencias(parcial ?? {}));
}
