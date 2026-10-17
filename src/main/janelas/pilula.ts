// Pílula flutuante: mostra o estado do ditado e é ela que grava o microfone.
// NUNCA pode roubar o foco — o texto tem que ser colado no app onde o usuário estava.
// Tem botões (✕ cancelar, ✓ terminar), então recebe cliques; a janela tem o tamanho exato da
// pílula para não bloquear cliques em volta.
import { BrowserWindow, screen, session } from "electron";
import { join } from "node:path";
import { CANAIS_PILULA, type ComandoPilula, type EstadoPilula } from "@shared/ipc";

/** Tamanho da janela por estado (px). A pílula ocupa a janela inteira. */
const TAMANHO = { normal: { largura: 168, altura: 44 }, erro: { largura: 340, altura: 44 } };
/** Distância da pílula até a borda de baixo da área útil da tela (px). */
const MARGEM_INFERIOR = 72;

let janela: BrowserWindow | null = null;

export function criarPilula(): void {
  janela = new BrowserWindow({
    width: TAMANHO.normal.largura,
    height: TAMANHO.normal.altura,
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
    // Clique no ✓/✕ funciona de primeira, sem antes "ativar" a janela.
    acceptFirstMouse: true,
    // No Mac, "panel" é uma janela que não ativa o app ao aparecer nem ao ser clicada.
    ...(process.platform === "darwin" ? { type: "panel" } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      // Gravar com a janela sem foco sem o Chromium frear os timers.
      backgroundThrottling: false,
    },
  });
  janela.setAlwaysOnTop(true, "screen-saver");
  janela.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Microfone liberado só para a pílula.
  const wcPilula = janela.webContents;
  session.defaultSession.setPermissionRequestHandler((wc, permissao, cb) => cb(permissao === "media" && wc === wcPilula));
  session.defaultSession.setPermissionCheckHandler((wc, permissao) => permissao === "media" && wc === wcPilula);

  if (process.env.ELECTRON_RENDERER_URL) void janela.loadURL(`${process.env.ELECTRON_RENDERER_URL}/pilula.html`);
  else void janela.loadFile(join(__dirname, "../renderer/pilula.html"));
}

/** webContents da pílula, para conferir quem mandou o áudio ou o clique. */
export function idWebContentsPilula(): number | null {
  return janela?.webContents.id ?? null;
}

function posicionar(tamanho: { largura: number; altura: number }): void {
  if (!janela) return;
  // Mantém a tela onde a pílula já está; só escolhe pela posição do mouse quando aparece.
  const referencia = janela.isVisible()
    ? screen.getDisplayMatching(janela.getBounds())
    : screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const tela = referencia.workArea;
  janela.setBounds({
    x: Math.round(tela.x + (tela.width - tamanho.largura) / 2),
    y: Math.round(tela.y + tela.height - tamanho.altura - MARGEM_INFERIOR),
    width: tamanho.largura,
    height: tamanho.altura,
  });
}

export function mostrarEstadoPilula(estado: EstadoPilula): void {
  if (!janela) return;
  janela.webContents.send(CANAIS_PILULA.ESTADO, estado);
  if (estado.estado === "oculta") {
    janela.hide();
    return;
  }
  posicionar(estado.estado === "erro" || estado.estado === "aviso" ? TAMANHO.erro : TAMANHO.normal);
  if (!janela.isVisible()) janela.showInactive();
}

export function comandarPilula(comando: ComandoPilula): void {
  janela?.webContents.send(CANAIS_PILULA.COMANDO, comando);
}
