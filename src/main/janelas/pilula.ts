// Pílula flutuante: mostra o estado do ditado e é ela que grava o microfone.
// NUNCA pode roubar o foco — o texto tem que ser colado no app onde o usuário estava.
// Tem botões (✕ cancelar, ✓ terminar), então recebe cliques; a janela tem o tamanho exato da
// pílula para não bloquear cliques em volta.
// A janela nunca é escondida: sem ditado ela encolhe para 1×1 px e ignora o mouse (como o Typeless 2.8.3).
// Escondida e mostrada a cada ditado, ela chegou a voltar "em nenhuma mesa" do macOS depois de dias de
// repousos e não aparecia mais (docs/correcoes/CORRECAO_PILULA_SEM_MESA_2026-10-27.md).
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
  /** Mensagem comprida (duas linhas de 12 px). */
  erroLongo: { largura: 420, altura: 38 },
  /** Processando com nota no lugar dos pontinhos, entre o ✕ e o ✓. */
  nota: { largura: 340, altura: 38 },
};
/** Largura a mais para o botão de ação ("Tentar de novo", "Copiar") ao lado da mensagem (px). */
const EXTRA_BOTAO_ACAO = 100;
/** Largura a mais para o tempo restante ("0:42") ao lado da onda (px). */
const EXTRA_CONTAGEM = 44;
/** Mensagens acima disso (caracteres) usam a janela larga. */
const LIMITE_MENSAGEM_CURTA = 60;
/** Distância da pílula até a borda de baixo da área útil da tela, logo acima do Dock (px). */
const MARGEM_INFERIOR = 20;
/** Tamanho da janela sem ditado: 1×1 px no canto da área útil, transparente e sem receber cliques. */
const RECOLHIDA = { largura: 1, altura: 1 };

let janela: BrowserWindow | null = null;
/** Último estado mostrado, para reposicionar a janela quando o estilo (escudo) muda com a pílula na tela. */
let ultimoEstado: EstadoPilula = { estado: "oculta" };
/** A pílula está aparecendo (fora isso a janela fica recolhida em 1×1). */
let expandida = false;

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
  // skipTransformProcessType: sem ele o Electron troca o tipo do processo (app de barra ↔ app normal) a cada
  // chamada, o que esconde as janelas e o Dock por um instante.
  janela.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true, skipTransformProcessType: true });
  if (process.platform === "darwin") janela.setHiddenInMissionControl(true);
  recolher();
  janela.showInactive();

  // Microfone liberado só para as páginas do próprio app (pílula grava; Configurações lista os
  // microfones; onboarding testa). Nada de fora é carregado nas janelas.
  const doApp = (url: string) =>
    url.startsWith("file://") || (!!process.env.ELECTRON_RENDERER_URL && url.startsWith(process.env.ELECTRON_RENDERER_URL));
  session.defaultSession.setPermissionRequestHandler((wc, permissao, cb) => cb(permissao === "media" && doApp(wc.getURL())));
  session.defaultSession.setPermissionCheckHandler((_wc, permissao, origem) => permissao === "media" && doApp(origem));

  // Trocar para (ou de) um estilo de clube muda a largura (o escudo ocupa 26 px): reposiciona na hora.
  aoMudarPreferencias((nova, anterior) => {
    if (larguraExtraEscudo(nova.estiloPilula) === larguraExtraEscudo(anterior.estiloPilula)) return;
    if (expandida) posicionar(tamanhoDoEstado(ultimoEstado));
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
  const referencia = expandida
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

/** Encolhe a janela para 1×1 px no canto da área útil, sem receber cliques (no lugar de esconder). */
function recolher(): void {
  if (!janela) return;
  expandida = false;
  janela.setIgnoreMouseEvents(true);
  const tela = screen.getDisplayMatching(janela.getBounds()).workArea;
  janela.setBounds({ x: tela.x, y: tela.y, width: RECOLHIDA.largura, height: RECOLHIDA.altura });
}

/** Tamanho da janela no estado dado; com escudo (estilo de clube) gravando/processando ficam 26 px mais largos. */
function tamanhoDoEstado(estado: EstadoPilula): { largura: number; altura: number } {
  if (estado.estado === "erro" || estado.estado === "aviso") {
    const base = estado.mensagem.length > LIMITE_MENSAGEM_CURTA ? TAMANHO.erroLongo : TAMANHO.erro;
    return { ...base, largura: base.largura + (estado.acao ? EXTRA_BOTAO_ACAO : 0) };
  }
  const escudo = larguraExtraEscudo(lerPreferencias().estiloPilula);
  if (estado.estado === "processando" && estado.nota) return { ...TAMANHO.nota, largura: TAMANHO.nota.largura + escudo };
  const base = "idioma" in estado && estado.idioma ? TAMANHO.traducao : TAMANHO.normal;
  const contagem = estado.estado === "gravando" && estado.restanteS != null ? EXTRA_CONTAGEM : 0;
  return { ...base, largura: base.largura + escudo + contagem };
}

export function mostrarEstadoPilula(estado: EstadoPilula): void {
  if (!janela) return;
  ultimoEstado = estado;
  janela.webContents.send(CANAIS_PILULA.ESTADO, estado);
  if (estado.estado === "oculta") {
    recolher();
    return;
  }
  posicionar(tamanhoDoEstado(estado));
  if (!expandida) {
    expandida = true;
    janela.setIgnoreMouseEvents(false);
  }
  // Nunca é escondida, mas se o sistema a tirou da tela (ex.: "Ocultar os outros"), volta.
  if (!janela.isVisible()) janela.showInactive();
}

export function comandarPilula(comando: ComandoPilula): void {
  janela?.webContents.send(CANAIS_PILULA.COMANDO, comando);
}
