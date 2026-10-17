// Janela de primeira abertura (onboarding): chave, permissões, testes de microfone e atalho.
import { BrowserWindow, ipcMain, shell } from "electron";
import { join } from "node:path";
import { CANAIS_JANELAS } from "@shared/ipc";
import { NOME_APP } from "@shared/config";
import { salvarPreferencias } from "../features/preferencias";
import { abrirConfiguracoes } from "./configuracoes";

let janela: BrowserWindow | null = null;

export function abrirOnboarding(): void {
  if (janela && !janela.isDestroyed()) {
    janela.show();
    janela.focus();
    return;
  }
  janela = new BrowserWindow({
    width: 760,
    height: 600,
    title: `${NOME_APP} — Boas-vindas`,
    center: true,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      // O medidor do microfone precisa continuar vivo mesmo se a janela perder o foco.
      backgroundThrottling: false,
    },
  });
  janela.once("ready-to-show", () => janela?.show());
  janela.on("closed", () => (janela = null));
  janela.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) void shell.openExternal(url);
    return { action: "deny" };
  });

  if (process.env.ELECTRON_RENDERER_URL) void janela.loadURL(`${process.env.ELECTRON_RENDERER_URL}/onboarding.html`);
  else void janela.loadFile(join(__dirname, "../renderer/onboarding.html"));
}

export function registrarIpcOnboarding(): void {
  ipcMain.handle(CANAIS_JANELAS.CONCLUIR_ONBOARDING, () => {
    salvarPreferencias({ onboardingConcluido: true });
    const j = janela;
    janela = null;
    if (j && !j.isDestroyed()) j.close();
    abrirConfiguracoes();
  });
}
