// Processo principal: ciclo de vida do app, registro do IPC, bandeja e janelas.
import { app } from "electron";
import { NOME_APP } from "@shared/config";
import { criarBandeja } from "./bandeja";
import { registrarIpcChaves } from "./features/chaves/ipc";
import { iniciarDicionario } from "./features/dicionario";
import { registrarIpcDicionario } from "./features/dicionario/ipc";
import { iniciarDitado } from "./features/ditado";
import { manterTecladoAtivo } from "./features/ditado/teclado";
import { registrarIpcEstatisticas } from "./features/estatisticas/ipc";
import { iniciarHistorico } from "./features/historico";
import { registrarIpcHistorico } from "./features/historico/ipc";
import { registrarIpcIa } from "./features/ia/ipc";
import { auxiliar } from "./features/nativo";
import { registrarIpcPermissoes } from "./features/permissoes/ipc";
import { lerPreferencias } from "./features/preferencias";
import { registrarIpcPreferencias } from "./features/preferencias/ipc";
import { iniciarSistema } from "./features/sistema";
import { registrarIpcSistema } from "./features/sistema/ipc";
import { registrarIpcCartao } from "./janelas/cartao";
import { abrirConfiguracoes } from "./janelas/configuracoes";
import { abrirOnboarding, registrarIpcOnboarding } from "./janelas/onboarding";
import { criarPilula } from "./janelas/pilula";
import { fecharBanco } from "./lib/banco";

app.setName(NOME_APP);

// Uma instância só: abrir de novo traz a janela da que já está rodando.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => abrirConfiguracoes());

  void app.whenReady().then(() => {
    // Dados
    iniciarHistorico();
    iniciarDicionario();

    // IPC
    registrarIpcChaves();
    registrarIpcPreferencias();
    registrarIpcIa();
    registrarIpcPermissoes();
    registrarIpcHistorico();
    registrarIpcEstatisticas();
    registrarIpcDicionario();
    registrarIpcSistema();
    registrarIpcCartao();
    registrarIpcOnboarding();

    // Sistema, teclado e ditado
    iniciarSistema();
    auxiliar.iniciar();
    manterTecladoAtivo();
    criarPilula();
    iniciarDitado();

    criarBandeja();
    if (lerPreferencias().onboardingConcluido) abrirConfiguracoes();
    else abrirOnboarding();
  });

  app.on("activate", () => abrirConfiguracoes());
  // Fechar a janela não encerra o app: ele continua na barra de menus.
  app.on("window-all-closed", () => {});
  app.on("before-quit", () => {
    auxiliar.encerrar();
    fecharBanco();
  });
}
