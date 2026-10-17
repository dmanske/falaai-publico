// Processo principal: ciclo de vida do app, registro do IPC, bandeja e janelas.
import { app } from "electron";
import { NOME_APP } from "@shared/config";
import { criarBandeja } from "./bandeja";
import { registrarIpcChaves } from "./features/chaves/ipc";
import { iniciarDitado } from "./features/ditado";
import { manterTecladoAtivo } from "./features/ditado/teclado";
import { registrarIpcIa } from "./features/ia/ipc";
import { auxiliar } from "./features/nativo";
import { registrarIpcPermissoes } from "./features/permissoes/ipc";
import { registrarIpcPreferencias } from "./features/preferencias/ipc";
import { abrirConfiguracoes } from "./janelas/configuracoes";
import { criarPilula } from "./janelas/pilula";

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
    registrarIpcPermissoes();

    auxiliar.iniciar();
    manterTecladoAtivo();
    criarPilula();
    iniciarDitado();

    criarBandeja();
    abrirConfiguracoes();
  });

  app.on("activate", () => abrirConfiguracoes());
  // Fechar a janela não encerra o app: ele continua na barra de menus.
  app.on("window-all-closed", () => {});
  app.on("before-quit", () => auxiliar.encerrar());
}
