// Ponte segura entre a tela e o processo principal. A tela só enxerga o que está aqui.
import { contextBridge, ipcRenderer } from "electron";
import { CANAIS, type Ponte } from "@shared/ipc";

const ponte: Ponte = {
  plataforma: process.platform,
  chaves: {
    status: (nome) => ipcRenderer.invoke(CANAIS.CHAVES_STATUS, nome),
    salvar: (nome, valor) => ipcRenderer.invoke(CANAIS.CHAVES_SALVAR, nome, valor),
    apagar: (nome) => ipcRenderer.invoke(CANAIS.CHAVES_APAGAR, nome),
  },
  preferencias: {
    ler: () => ipcRenderer.invoke(CANAIS.PREFERENCIAS_LER),
    salvar: (parcial) => ipcRenderer.invoke(CANAIS.PREFERENCIAS_SALVAR, parcial),
  },
  ia: {
    testar: () => ipcRenderer.invoke(CANAIS.IA_TESTAR),
  },
};

contextBridge.exposeInMainWorld("ponte", ponte);
