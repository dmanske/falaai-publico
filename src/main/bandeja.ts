// Ícone na barra de menus (Mac) / área de notificação (Windows).
import { Menu, Tray, app, ipcMain, nativeImage, type MenuItemConstructorOptions } from "electron";
import { NOME_APP } from "@shared/config";
import { CANAIS_PILULA, type EntradaAudio, type MicrofoneListado } from "@shared/ipc";
import { acharEntrada, rotuloTransporte } from "@shared/microfones";
import { caminhoRecurso } from "./lib/recursos";
import { abrirHub } from "./janelas/hub";
import { idWebContentsPilula } from "./janelas/pilula";
import { lerDispositivosAudio } from "./features/sistema/lib/dispositivos";
import { aoMudarPreferencias, lerPreferencias, salvarPreferencias } from "./features/preferencias";

/** Limites ao aceitar a lista vinda da pílula (defesa contra dado estranho). */
const MAX_MICROFONES = 30;
const MAX_NOME_MICROFONE = 80;

let bandeja: Tray | null = null;
/** Microfones que a pílula enxerga (o processo principal não lista). */
let microfones: MicrofoneListado[] = [];
/** Entradas do CoreAudio (tipo de cada microfone); vazio no Windows ou se o auxiliar não responder. */
let entradas: EntradaAudio[] = [];

/** Nome do microfone no menu, com o tipo quando se sabe (ex.: "AirPods Pro · Bluetooth"). */
function rotuloMicrofone(m: MicrofoneListado): string {
  const tipo = rotuloTransporte(acharEntrada(m.nome, entradas)?.transporte);
  return tipo ? `${m.nome} · ${tipo}` : m.nome;
}

/** Só aceita itens {id, nome} com texto; sem nome (microfone ainda não liberado) não entra. */
function limparLista(bruto: unknown): MicrofoneListado[] {
  if (!Array.isArray(bruto)) return [];
  const lista: MicrofoneListado[] = [];
  for (const m of bruto.slice(0, MAX_MICROFONES)) {
    if (!m || typeof m !== "object") continue;
    const { id, nome } = m as Record<string, unknown>;
    if (typeof id !== "string" || typeof nome !== "string" || !id || !nome.trim()) continue;
    lista.push({ id, nome: nome.trim().slice(0, MAX_NOME_MICROFONE) });
  }
  return lista;
}

function submenuMicrofone(): MenuItemConstructorOptions[] {
  const atual = lerPreferencias().microfoneId;
  // Preferência apontando para um microfone que sumiu: na prática o padrão do sistema está em uso.
  const escolhido = atual && microfones.some((m) => m.id === atual) ? atual : null;
  return [
    { label: "Padrão do sistema", type: "radio", checked: escolhido === null, click: () => salvarPreferencias({ microfoneId: null }) },
    ...microfones.map<MenuItemConstructorOptions>((m) => ({
      label: rotuloMicrofone(m),
      type: "radio",
      checked: escolhido === m.id,
      click: () => salvarPreferencias({ microfoneId: m.id }),
    })),
  ];
}

function montarMenu(): Menu {
  return Menu.buildFromTemplate([
    { label: `Abrir ${NOME_APP}`, click: () => abrirHub("inicio") },
    { label: "Histórico", click: () => abrirHub("historico") },
    { label: "Dicionário", click: () => abrirHub("dicionario") },
    { type: "separator" },
    { label: "Microfone", submenu: submenuMicrofone() },
    { label: "Configurações…", click: () => abrirHub("configuracoes") },
    { type: "separator" },
    { label: `${NOME_APP} ${app.getVersion()}`, enabled: false },
    { label: "Verificar atualizações", click: () => abrirHub("configuracoes", "atualizacoes") },
    { type: "separator" },
    { label: `Sair do ${NOME_APP}`, click: () => app.quit() },
  ]);
}

export function criarBandeja(): void {
  // "Template" no nome faz o macOS pintar o ícone conforme o tema (claro/escuro).
  const icone = nativeImage.createFromPath(caminhoRecurso("iconeBandejaTemplate.png"));
  bandeja = new Tray(icone);
  bandeja.setToolTip(NOME_APP);
  bandeja.setContextMenu(montarMenu());

  // A lista de microfones vem da pílula (só ela é sempre carregada e enxerga os dispositivos).
  ipcMain.on(CANAIS_PILULA.MICROFONES, (e, bruto: unknown) => {
    if (e.sender.id !== idWebContentsPilula()) return;
    microfones = limparLista(bruto);
    bandeja?.setContextMenu(montarMenu());
    // Os tipos chegam depois (consulta ao auxiliar); refaz o menu quando vierem. Falha = menu sem tipos.
    void lerDispositivosAudio()
      .then((d) => {
        entradas = d?.entradas ?? [];
        if (entradas.length) bandeja?.setContextMenu(montarMenu());
      })
      .catch(() => {});
  });
  // Microfone trocado nas Configurações: o item marcado no menu acompanha.
  aoMudarPreferencias((nova, anterior) => {
    if (nova.microfoneId !== anterior.microfoneId) bandeja?.setContextMenu(montarMenu());
  });
}
