// Ícone na barra de menus (Mac) / área de notificação (Windows).
import { Menu, Tray, app, nativeImage } from "electron";
import { NOME_APP } from "@shared/config";
import { caminhoRecurso } from "./lib/recursos";
import { abrirConfiguracoes } from "./janelas/configuracoes";

let bandeja: Tray | null = null;

export function criarBandeja(): void {
  // "Template" no nome faz o macOS pintar o ícone conforme o tema (claro/escuro).
  const icone = nativeImage.createFromPath(caminhoRecurso("iconeBandejaTemplate.png"));
  bandeja = new Tray(icone);
  bandeja.setToolTip(NOME_APP);
  bandeja.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Configurações…", click: () => abrirConfiguracoes() },
      { type: "separator" },
      { label: `Sair do ${NOME_APP}`, click: () => app.quit() },
    ]),
  );
}
