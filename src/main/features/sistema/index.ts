// Aplica no sistema as preferências gerais (abrir com o sistema, Dock, tema) e reage às mudanças.
import { app, nativeTheme } from "electron";
import type { Preferencias } from "@shared/ipc";
import { aoMudarPreferencias, lerPreferencias } from "../preferencias";

const TEMA: Record<Preferencias["tema"], "system" | "light" | "dark"> = {
  sistema: "system",
  claro: "light",
  escuro: "dark",
};

function aplicarAbrirComSistema(ligado: boolean): void {
  // Em desenvolvimento isso registraria o executável do Electron como item de login: só no app instalado.
  if (!app.isPackaged) return;
  app.setLoginItemSettings({ openAtLogin: ligado });
}

function aplicarDock(mostrar: boolean): void {
  // Mac: Dock. Windows: barra de tarefas ainda não tratada (fica como está).
  if (process.platform !== "darwin") return;
  if (mostrar) void app.dock?.show();
  else app.dock?.hide();
}

/** Aplica abrir com o sistema, Dock e tema conforme as preferências, e reage às mudanças. */
export function iniciarSistema(): void {
  const p = lerPreferencias();
  aplicarAbrirComSistema(p.abrirComSistema);
  aplicarDock(p.mostrarNoDock);
  nativeTheme.themeSource = TEMA[p.tema];

  aoMudarPreferencias((nova, anterior) => {
    if (nova.abrirComSistema !== anterior.abrirComSistema) aplicarAbrirComSistema(nova.abrirComSistema);
    if (nova.mostrarNoDock !== anterior.mostrarNoDock) aplicarDock(nova.mostrarNoDock);
    if (nova.tema !== anterior.tema) nativeTheme.themeSource = TEMA[nova.tema];
  });
}
