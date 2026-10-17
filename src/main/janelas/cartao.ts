// Cartão com a resposta do modo "Pergunte qualquer coisa" (sem texto selecionado).
// Não pode roubar o foco: o usuário continua no app onde estava; mas aceita clique (copiar).
import { BrowserWindow, ipcMain, screen } from "electron";
import { join } from "node:path";
import { CANAIS_JANELAS, type ConteudoCartao } from "@shared/ipc";

const LARGURA = 440;
const ALTURA = 360;
/** Distância da borda de baixo da área útil: fica acima da pílula (que está a 72 px + 44 de altura). */
const MARGEM_INFERIOR = 72 + 44 + 16;

let janela: BrowserWindow | null = null;
let ultimo: ConteudoCartao | null = null;
let carregada = false;

function enviar(): void {
  if (janela && !janela.isDestroyed() && carregada && ultimo) janela.webContents.send(CANAIS_JANELAS.CARTAO_CONTEUDO, ultimo);
}

function posicionar(): void {
  if (!janela) return;
  const tela = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
  janela.setBounds({
    x: Math.round(tela.x + (tela.width - LARGURA) / 2),
    y: Math.round(tela.y + tela.height - ALTURA - MARGEM_INFERIOR),
    width: LARGURA,
    height: ALTURA,
  });
}

function criar(): BrowserWindow {
  const j = new BrowserWindow({
    width: LARGURA,
    height: ALTURA,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    // Aparece sem roubar o foco (showInactive), mas aceita foco ao ser clicado: assim Esc fecha e
    // "Copiar" funciona (a área de transferência do navegador exige a janela em foco).
    focusable: true,
    skipTaskbar: true,
    hasShadow: false,
    alwaysOnTop: true,
    fullscreenable: false,
    acceptFirstMouse: true,
    ...(process.platform === "darwin" ? { type: "panel" } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  j.setAlwaysOnTop(true, "screen-saver");
  j.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  carregada = false;
  j.webContents.on("did-finish-load", () => {
    carregada = true;
    enviar();
  });
  j.on("closed", () => {
    janela = null;
    carregada = false;
  });
  if (process.env.ELECTRON_RENDERER_URL) void j.loadURL(`${process.env.ELECTRON_RENDERER_URL}/cartao.html`);
  else void j.loadFile(join(__dirname, "../renderer/cartao.html"));
  return j;
}

/** Mostra o cartão com a resposta do modo "pergunte" (sem roubar o foco do app do usuário). */
export function mostrarCartao(c: ConteudoCartao): void {
  ultimo = c;
  if (!janela || janela.isDestroyed()) janela = criar();
  posicionar();
  enviar();
  if (!janela.isVisible()) janela.showInactive();
}

export function registrarIpcCartao(): void {
  // fecharCartao() na ponte usa ipcRenderer.send.
  ipcMain.on(CANAIS_JANELAS.CARTAO_FECHAR, () => {
    if (janela && !janela.isDestroyed()) janela.hide();
  });
}
