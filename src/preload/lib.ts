import { ipcRenderer, type IpcRendererEvent } from "electron";

/** Registra um ouvinte de evento vindo do processo principal e devolve a função que o remove. */
export function ouvir<T>(canal: string, cb: (dado: T) => void): () => void {
  const ouvinte = (_e: IpcRendererEvent, dado: T) => cb(dado);
  ipcRenderer.on(canal, ouvinte);
  return () => ipcRenderer.removeListener(canal, ouvinte);
}

export const invocar = <T>(canal: string, ...args: unknown[]): Promise<T> => ipcRenderer.invoke(canal, ...args);
