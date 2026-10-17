// Agrupa itens por dia ("Hoje", "Ontem", "12 de outubro").
import type { ItemHistorico } from "@shared/ipc";

export interface GrupoDia {
  chave: string;
  rotulo: string;
  itens: ItemHistorico[];
}

function chaveLocal(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function rotuloDia(data: Date, agora = new Date()): string {
  if (chaveLocal(data) === chaveLocal(agora)) return "Hoje";
  const ontem = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 1);
  if (chaveLocal(data) === chaveLocal(ontem)) return "Ontem";
  return data.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    ...(data.getFullYear() !== agora.getFullYear() ? { year: "numeric" } : {}),
  });
}

/** Mantém a ordem recebida (já vem do mais novo para o mais velho). */
export function agruparPorDia(itens: ItemHistorico[], agora = new Date()): GrupoDia[] {
  const grupos: GrupoDia[] = [];
  for (const item of itens) {
    const data = new Date(item.criadoEm);
    const chave = chaveLocal(data);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo?.chave === chave) ultimo.itens.push(item);
    else grupos.push({ chave, rotulo: rotuloDia(data, agora), itens: [item] });
  }
  return grupos;
}

export function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
