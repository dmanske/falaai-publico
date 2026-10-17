// Bloco "Ritmo da fala" que entra no prompt dos modos ditado e tradução.
import type { Ritmo } from "./index.ts";

/** Máximo de pausas listadas; acima disso só entram as longas (e no máximo este tanto delas). */
export const MAX_PAUSAS_NO_BLOCO = 25;

const num = (n: number): string => n.toFixed(1).replace(".", ",");

/** Texto do bloco, ou "" quando não há pausas (nada a dizer à IA). */
export function blocoRitmo(r: Ritmo): string {
  if (!r.pausas.length) return "";
  let lista = r.pausas;
  let nota = "";
  if (lista.length > MAX_PAUSAS_NO_BLOCO) {
    const total = lista.length;
    lista = lista.filter((p) => p.tipo === "longa").slice(0, MAX_PAUSAS_NO_BLOCO);
    nota = ` (${total} pausas no total; só as longas estão listadas)`;
  }
  const itens = lista.map((p) => `${num(p.inicioS)}–${num(p.fimS)} s (${p.tipo})`).join(", ");
  return `\n\n## Ritmo da fala (medido no áudio)\nDuração ${num(r.duracaoS)} s, com ${num(r.falaS)} s de fala. Pausas${nota}: ${itens}.\nUse as pausas longas como fim de frase/parágrafo ou separação de itens; pausas curtas costumam ser vírgula ou fim de frase. Não escreva nada sobre pausas na saída.`;
}
