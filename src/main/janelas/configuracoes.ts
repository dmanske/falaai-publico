// Janela de configurações (por enquanto a única janela do app).
import { BrowserWindow, shell } from "electron";
import { join } from "node:path";
import { NOME_APP } from "@shared/config";

let janela: BrowserWindow | null = null;

export function abrirConfiguracoes(): BrowserWindow {
  if (janela && !janela.isDestroyed()) {
    janela.show();
    janela.focus();
    return janela;
  }
  janela = new BrowserWindow({
    width: 640,
    height: 680,
    minWidth: 520,
    minHeight: 520,
    title: `${NOME_APP} — Configurações`,
    show: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  janela.once("ready-to-show", () => janela?.show());
  janela.on("closed", () => (janela = null));
  // Links externos abrem no navegador, nunca dentro do app.
  janela.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) void shell.openExternal(url);
    return { action: "deny" };
  });

  if (process.env.ELECTRON_RENDERER_URL) void janela.loadURL(process.env.ELECTRON_RENDERER_URL);
  else void janela.loadFile(join(__dirname, "../renderer/index.html"));
  return janela;
}
