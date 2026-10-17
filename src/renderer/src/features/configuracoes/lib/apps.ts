import type { ItemHistorico } from "@shared/ipc";
import type { AppUsado } from "../types";

const PARECE_CHAT = /kiro|claude|chatgpt|slack|whatsapp|telegram|discord|teams|messages|mensagens|cursor/i;

/** Apps únicos (por appId) do histórico, com a contagem de usos, mais os já marcados que não aparecem lá. */
export function montarApps(itens: ItemHistorico[], marcados: string[]): AppUsado[] {
  const mapa = new Map<string, AppUsado>();
  for (const it of itens) {
    if (!it.appId) continue;
    const atual = mapa.get(it.appId);
    if (atual) atual.usos += 1;
    else {
      const nome = it.app?.trim() || it.appId;
      mapa.set(it.appId, { appId: it.appId, nome, usos: 1, comum: PARECE_CHAT.test(nome) });
    }
  }
  for (const id of marcados) {
    if (!mapa.has(id)) mapa.set(id, { appId: id, nome: id, usos: 0, comum: PARECE_CHAT.test(id) });
  }
  return [...mapa.values()].sort((a, b) => Number(b.comum) - Number(a.comum) || b.usos - a.usos || a.nome.localeCompare(b.nome));
}
