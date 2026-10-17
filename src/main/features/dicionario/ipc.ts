import { ipcMain } from "electron";
import { CANAIS_DICIONARIO } from "@shared/ipc";
import { apagar, atualizar, avisarMudou, importar, inserir, listar } from "./repositorio";

export function registrarIpcDicionario(): void {
  ipcMain.handle(CANAIS_DICIONARIO.LISTAR, (_e, busca?: string) => listar(busca));
  ipcMain.handle(CANAIS_DICIONARIO.ADICIONAR, (_e, termo: string) => {
    const p = inserir(termo, "manual");
    avisarMudou();
    return p;
  });
  ipcMain.handle(CANAIS_DICIONARIO.ATUALIZAR, (_e, id: string, termo: string) => {
    const p = atualizar(id, termo);
    avisarMudou();
    return p;
  });
  ipcMain.handle(CANAIS_DICIONARIO.APAGAR, (_e, ids: string[]) => {
    apagar(ids);
    avisarMudou();
  });
  ipcMain.handle(CANAIS_DICIONARIO.IMPORTAR_CSV, (_e, conteudo: string) => {
    const r = importar(conteudo);
    if (r.adicionadas > 0) avisarMudou();
    return r;
  });
}
