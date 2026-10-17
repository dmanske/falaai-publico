// Pílula flutuante: mostra o estado do ditado e é ela que grava o microfone.
// NUNCA pode roubar o foco — o texto tem que ser colado no app onde o usuário estava.
import { BrowserWindow, screen, session } from "electron";
import { join } from "node:path";
import { CANAIS, type ComandoPilula, type EstadoPilula } from "@shared/ipc";

const LARGURA = 220;
const ALTURA = 64;
/** Distância da pílula até a borda de baixo da área útil da tela (px). */
const MARGEM_INFERIOR = 72;

let janela: BrowserWindow | null = null;

export function criarPilula(): void {
  janela = new BrowserWindow({
    width: LARGURA,
    height: ALTURA,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    focusable: false,
    skipTaskbar: true,
    hasShadow: false,
    alwaysOnTop: true,
    fullscreenable: false,
    // No Mac, "panel" é uma janela que não ativa o app ao aparecer.
    ...(process.platform === "darwin" ? { type: "panel" } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      // Gravar com a janela escondida/sem foco sem o Chromium frear os timers.
      backgroundThrottling: false,
    },
  });
  janela.setAlwaysOnTop(true, "screen-saver");
  janela.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  janela.setIgnoreMouseEvents(true);

  // Microfone liberado só para a pílula.
  const wcPilula = janela.webContents;
  session.defaultSession.setPermissionRequestHandler((wc, permissao, cb) => cb(permissao === "media" && wc === wcPilula));
  session.defaultSession.setPermissionCheckHandler((wc, permissao) => permissao === "media" && wc === wcPilula);

  if (process.env.ELECTRON_RENDERER_URL) void janela.loadURL(`${process.env.ELECTRON_RENDERER_URL}/pilula.html`);
  else void janela.loadFile(join(__dirname, "../renderer/pilula.html"));
}

/** webContents da pílula, para conferir quem mandou o áudio. */
export function idWebContentsPilula(): number | null {
  return janela?.webContents.id ?? null;
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

export function mostrarEstadoPilula(estado: EstadoPilula): void {
  if (!janela) return;
  janela.webContents.send(CANAIS.PILULA_ESTADO, estado);
  if (estado.estado === "oculta") {
    janela.hide();
  } else if (!janela.isVisible()) {
    posicionar();
    janela.showInactive();
  }
}

export function comandarPilula(comando: ComandoPilula): void {
  janela?.webContents.send(CANAIS.PILULA_COMANDO, comando);
}
