// Processo principal: ciclo de vida do app, registro do IPC, bandeja e janelas.
import { app, nativeImage } from "electron";
import { NOME_APP } from "@shared/config";
import { criarBandeja } from "./bandeja";
import { registrarIpcChaves } from "./features/chaves/ipc";
import { iniciarDicionario } from "./features/dicionario";
import { registrarIpcDicionario } from "./features/dicionario/ipc";
import { iniciarDitado } from "./features/ditado";
import { registrarIpcAtalhos } from "./features/ditado/atalhosIpc";
import { manterTecladoAtivo } from "./features/ditado/teclado";
import { registrarIpcEstatisticas } from "./features/estatisticas/ipc";
import { iniciarEstatisticas } from "./features/estatisticas";
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
import { caminhoRecurso } from "./lib/recursos";

app.setName(NOME_APP);

// Uma instância só: abrir de novo traz a janela da que já está rodando.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => abrirConfiguracoes());

  void app.whenReady().then(() => {
    // Em desenvolvimento o Dock mostraria o ícone do Electron: usa o do FalaAi (o app instalado já
    // traz o ícone em build/icon.png).
    if (process.platform === "darwin" && !app.isPackaged) app.dock?.setIcon(nativeImage.createFromPath(caminhoRecurso("icone-app.png")));

    // Dados
    iniciarHistorico();
    iniciarEstatisticas();
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
    registrarIpcAtalhos();

    // Sistema, teclado e ditado
    iniciarSistema();
    auxiliar.iniciar();
    manterTecladoAtivo();
    criarPilula();
    iniciarDitado();

    criarBandeja();
    // Depois do onboarding, o FalaAi pode iniciar só na barra de menus (o ícone abre a janela).
    const prefs = lerPreferencias();
    if (!prefs.onboardingConcluido) abrirOnboarding();
    else if (prefs.abrirJanelaAoIniciar) abrirConfiguracoes();
  });

  app.on("activate", () => abrirConfiguracoes());
  // Fechar a janela não encerra o app: ele continua na barra de menus.
  app.on("window-all-closed", () => {});
  app.on("before-quit", () => {
    auxiliar.encerrar();
    fecharBanco();
  });
}
