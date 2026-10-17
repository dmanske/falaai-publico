import { ipcMain } from "electron";
import { CANAIS } from "@shared/ipc";
import { lerPermissoes, pedirPermissao } from "./index";

export function registrarIpcPermissoes(): void {
  ipcMain.handle(CANAIS.PERMISSOES_LER, () => lerPermissoes());
  ipcMain.handle(CANAIS.PERMISSOES_PEDIR, (_e, qual: "microfone" | "acessibilidade" | "ajustes-teclado") =>
    pedirPermissao(qual),
  );
}
