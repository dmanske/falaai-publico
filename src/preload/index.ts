// Ponte segura entre a tela e o processo principal. A tela só enxerga o que está aqui.
import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import { CANAIS, type Ponte } from "@shared/ipc";

/** Registra um ouvinte e devolve a função que o remove. */
function ouvir<T>(canal: string, cb: (dado: T) => void): () => void {
  const ouvinte = (_e: IpcRendererEvent, dado: T) => cb(dado);
  ipcRenderer.on(canal, ouvinte);
  return () => ipcRenderer.removeListener(canal, ouvinte);
}

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
  permissoes: {
    ler: () => ipcRenderer.invoke(CANAIS.PERMISSOES_LER),
    pedir: (qual) => ipcRenderer.invoke(CANAIS.PERMISSOES_PEDIR, qual),
  },
  pilula: {
    aoComando: (cb) => ouvir(CANAIS.PILULA_COMANDO, cb),
    aoEstado: (cb) => ouvir(CANAIS.PILULA_ESTADO, cb),
    enviarAudio: (a) => ipcRenderer.send(CANAIS.PILULA_AUDIO, a),
    acao: (acao) => ipcRenderer.send(CANAIS.PILULA_ACAO, acao),
  },
};

contextBridge.exposeInMainWorld("ponte", ponte);
