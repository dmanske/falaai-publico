import { ipcMain } from "electron";
import { CANAIS_IA } from "@shared/ipc";
import { listarModelosOpenRouter } from "./provedores/openrouter";
import { testarIa } from "./testeChave";

export function registrarIpcIa(): void {
  ipcMain.handle(CANAIS_IA.TESTAR, () => testarIa());
  ipcMain.handle(CANAIS_IA.MODELOS_OPENROUTER, (_e, opcoes?: { todos?: boolean; recarregar?: boolean }) =>
    listarModelosOpenRouter({ todos: !!opcoes?.todos, recarregar: !!opcoes?.recarregar }),
  );
}
