// Pílula flutuante: mostra o estado do ditado e é ela que grava o microfone.
// NUNCA pode roubar o foco — o texto tem que ser colado no app onde o usuário estava.
// Tem botões (✕ cancelar, ✓ terminar), então recebe cliques; a janela tem o tamanho exato da
// pílula para não bloquear cliques em volta.
import { BrowserWindow, screen, session } from "electron";
import { join } from "node:path";
import { CANAIS_PILULA, type ComandoPilula, type EstadoPilula } from "@shared/ipc";
import { larguraExtraEscudo } from "@shared/temas/clubes";
import { aoMudarPreferencias, lerPreferencias } from "../features/preferencias";

/** Tamanho da janela por estado (px). A pílula ocupa a janela inteira. */
const TAMANHO = {
  normal: { largura: 144, altura: 38 },
  /** Modo tradução: cabe a bandeira e a sigla do idioma (ex.: "EN") ao lado da onda. */
  traducao: { largura: 188, altura: 38 },
  erro: { largura: 300, altura: 38 },
};
/** Distância da pílula até a borda de baixo da área útil da tela, logo acima do Dock (px). */
const MARGEM_INFERIOR = 20;

let janela: BrowserWindow | null = null;
/** Último estado mostrado, para reposicionar a janela quando o estilo (escudo) muda com a pílula na tela. */
let ultimoEstado: EstadoPilula = { estado: "oculta" };

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

  // Microfone liberado só para as páginas do próprio app (pílula grava; Configurações lista os
  // microfones; onboarding testa). Nada de fora é carregado nas janelas.
  const doApp = (url: string) =>
    url.startsWith("file://") || (!!process.env.ELECTRON_RENDERER_URL && url.startsWith(process.env.ELECTRON_RENDERER_URL));
  session.defaultSession.setPermissionRequestHandler((wc, permissao, cb) => cb(permissao === "media" && doApp(wc.getURL())));
  session.defaultSession.setPermissionCheckHandler((_wc, permissao, origem) => permissao === "media" && doApp(origem));

  // Trocar para (ou de) um estilo de clube muda a largura (o escudo ocupa 26 px): reposiciona na hora.
  aoMudarPreferencias((nova, anterior) => {
    if (larguraExtraEscudo(nova.estiloPilula) === larguraExtraEscudo(anterior.estiloPilula)) return;
    if (janela?.isVisible() && ultimoEstado.estado !== "oculta") posicionar(tamanhoDoEstado(ultimoEstado));
  });

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

/** Tamanho da janela no estado dado; com escudo (estilo de clube) gravando/processando ficam 26 px mais largos. */
function tamanhoDoEstado(estado: EstadoPilula): { largura: number; altura: number } {
  if (estado.estado === "erro" || estado.estado === "aviso") return TAMANHO.erro;
  const base = "idioma" in estado && estado.idioma ? TAMANHO.traducao : TAMANHO.normal;
  return { ...base, largura: base.largura + larguraExtraEscudo(lerPreferencias().estiloPilula) };
}

export function mostrarEstadoPilula(estado: EstadoPilula): void {
  if (!janela) return;
  ultimoEstado = estado;
  janela.webContents.send(CANAIS_PILULA.ESTADO, estado);
  if (estado.estado === "oculta") {
    janela.hide();
    return;
  }
  posicionar(tamanhoDoEstado(estado));
  if (!janela.isVisible()) janela.showInactive();
}

export function comandarPilula(comando: ComandoPilula): void {
  janela?.webContents.send(CANAIS_PILULA.COMANDO, comando);
}
