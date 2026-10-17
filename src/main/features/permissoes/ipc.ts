import { ipcMain } from "electron";
import { CANAIS_PERMISSOES, type PermissaoPedida } from "@shared/ipc";
import { lerPermissoes, pedirPermissao } from "./index";

export function registrarIpcPermissoes(): void {
  ipcMain.handle(CANAIS_PERMISSOES.LER, () => lerPermissoes());
  ipcMain.handle(CANAIS_PERMISSOES.PEDIR, (_e, qual: PermissaoPedida) =>
    pedirPermissao(qual),
  );
}
