// Gravar atalho nas Configurações: quem lê as teclas é o auxiliar nativo (enxerga Fn e toque duplo,
// e não deixa o atalho disparar um ditado enquanto grava).
import { ipcMain } from "electron";
import { CANAIS_ATALHOS, type ResultadoCaptura } from "@shared/ipc";
import { auxiliar } from "../nativo";

/** A captura espera até 10 s pela tecla; um pouco de folga para a resposta chegar. */
const PRAZO_CAPTURA_MS = 12_000;

export function registrarIpcAtalhos(): void {
  ipcMain.handle(CANAIS_ATALHOS.CAPTURAR, async (): Promise<ResultadoCaptura> => {
    const r = await auxiliar.enviar({ cmd: "capturar_atalho" }, PRAZO_CAPTURA_MS);
    if (r.ok && Array.isArray(r.teclas)) return { ok: true, teclas: r.teclas as string[] };
    return { ok: false, erro: r.erro ?? "Não consegui gravar o atalho." };
  });
  ipcMain.handle(CANAIS_ATALHOS.CANCELAR_CAPTURA, async () => {
    await auxiliar.enviar({ cmd: "cancelar_captura" });
  });
}
