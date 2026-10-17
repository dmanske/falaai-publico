// Janela principal (hub): menu lateral + Início, Histórico, Dicionário e Configurações.
// Uma janela só: se já existe, mostra e navega para a página pedida.
import { BrowserWindow, shell } from "electron";
import { join } from "node:path";
import { NOME_APP } from "@shared/config";
import { CANAIS_JANELAS, type PaginaHub } from "@shared/ipc";

let janela: BrowserWindow | null = null;

/**
 * `secao` (opcional) escolhe a seção das Configurações (ex.: "sobre"). Vai no hash da URL
 * ("#configuracoes:sobre"), porque o contrato NAVEGAR só carrega a página.
 */
export function abrirHub(pagina: PaginaHub = "inicio", secao?: string): BrowserWindow {
  const hash = secao ? `${pagina}:${secao}` : pagina;
  if (janela && !janela.isDestroyed()) {
    if (janela.isMinimized()) janela.restore();
    janela.show();
    janela.focus();
    janela.webContents.send(CANAIS_JANELAS.NAVEGAR, pagina);
    if (secao) void janela.webContents.executeJavaScript(`location.hash = ${JSON.stringify(hash)}`).catch(() => {});
    return janela;
  }

  const mac = process.platform === "darwin";
  janela = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 920,
    minHeight: 620,
    title: NOME_APP,
    show: false,
    // Mac: sem barra de título; os botões vermelho/amarelo/verde ficam dentro do menu lateral.
    ...(mac ? { titleBarStyle: "hiddenInset" as const, trafficLightPosition: { x: 22, y: 22 } } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  if (!mac) janela.setMenuBarVisibility(false);
  const esta = janela;
  esta.once("ready-to-show", () => esta.show());
  esta.on("closed", () => {
    if (janela === esta) janela = null;
  });
  // Links externos abrem no navegador, nunca dentro do app.
  esta.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) void shell.openExternal(url);
    return { action: "deny" };
  });

  // A página inicial vai no hash da URL: não depende de a tela já estar ouvindo o canal NAVEGAR.
  if (process.env.ELECTRON_RENDERER_URL) void esta.loadURL(`${process.env.ELECTRON_RENDERER_URL}#${hash}`);
  else void esta.loadFile(join(__dirname, "../renderer/index.html"), { hash });
  return esta;
}
