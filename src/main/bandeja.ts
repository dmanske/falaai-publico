// Ícone na barra de menus (Mac) / área de notificação (Windows).
import { Menu, Tray, app, nativeImage } from "electron";
import { NOME_APP } from "@shared/config";
import { caminhoRecurso } from "./lib/recursos";
import { abrirHub } from "./janelas/hub";

let bandeja: Tray | null = null;

export function criarBandeja(): void {
  // "Template" no nome faz o macOS pintar o ícone conforme o tema (claro/escuro).
  const icone = nativeImage.createFromPath(caminhoRecurso("iconeBandejaTemplate.png"));
  bandeja = new Tray(icone);
  bandeja.setToolTip(NOME_APP);
  bandeja.setContextMenu(
    Menu.buildFromTemplate([
      { label: `Abrir ${NOME_APP}`, click: () => abrirHub("inicio") },
      { label: "Histórico", click: () => abrirHub("historico") },
      { label: "Dicionário", click: () => abrirHub("dicionario") },
      { type: "separator" },
      { label: "Configurações…", click: () => abrirHub("configuracoes") },
      { type: "separator" },
      { label: `${NOME_APP} ${app.getVersion()}`, enabled: false },
      { label: "Verificar atualizações", click: () => abrirHub("configuracoes", "atualizacoes") },
      { type: "separator" },
      { label: `Sair do ${NOME_APP}`, click: () => app.quit() },
    ]),
  );
}
