// Compatibilidade: a janela de configurações virou o hub (janelas/hub.ts).
import type { BrowserWindow } from "electron";
import { abrirHub } from "./hub";

export { abrirHub };

/** Abre o hub na página Início (usada pelo index, pelo onboarding e pelo "abrir de novo"). */
export function abrirConfiguracoes(): BrowserWindow {
  return abrirHub("inicio");
}
