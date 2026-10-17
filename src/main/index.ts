// Processo principal: ciclo de vida do app, registro do IPC, bandeja e janelas.
import { app } from "electron";
import { NOME_APP } from "@shared/config";
import { criarBandeja } from "./bandeja";
import { registrarIpcChaves } from "./features/chaves/ipc";
import { registrarIpcIa } from "./features/ia/ipc";
import { registrarIpcPreferencias } from "./features/preferencias/ipc";
import { abrirConfiguracoes } from "./janelas/configuracoes";

app.setName(NOME_APP);

// Uma instância só: abrir de novo traz a janela da que já está rodando.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => abrirConfiguracoes());

  void app.whenReady().then(() => {
    registrarIpcChaves();
    registrarIpcPreferencias();
    registrarIpcIa();
    criarBandeja();
    abrirConfiguracoes();
  });

  app.on("activate", () => abrirConfiguracoes());
  // Fechar a janela não encerra o app: ele continua na barra de menus.
  app.on("window-all-closed", () => {});
}
