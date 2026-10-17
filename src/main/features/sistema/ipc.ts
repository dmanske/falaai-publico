import { app, ipcMain, shell } from "electron";
import { CANAIS_JANELAS, CANAIS_SISTEMA, type InfoSistema, type PaginaHub } from "@shared/ipc";
import { abrirHub } from "../../janelas/hub";
import { verificarAtualizacao } from "./api/github";

export function registrarIpcSistema(): void {
  ipcMain.handle(
    CANAIS_SISTEMA.INFO,
    (): InfoSistema => ({ versao: app.getVersion(), plataforma: process.platform, pastaDados: app.getPath("userData") }),
  );
  ipcMain.handle(CANAIS_SISTEMA.VERIFICAR_ATUALIZACAO, () => verificarAtualizacao());
  ipcMain.handle(CANAIS_SISTEMA.ABRIR_LINK, async (_e, url: unknown) => {
    if (typeof url === "string" && url.startsWith("https://")) await shell.openExternal(url);
  });
  ipcMain.handle(CANAIS_JANELAS.ABRIR_HUB, (_e, pagina?: PaginaHub) => {
    abrirHub(pagina);
  });
}
