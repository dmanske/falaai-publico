// Estilos gerais da pílula (os de clube ficam em clubes.ts). São só dados: o visual de cada um está em
// src/renderer/src/features/pilula/estilos.css, na classe `pil-<id>`.

export type IdEstiloPilula = "original" | "vidro" | "azul" | "aurora" | "neon" | "por-do-sol" | "equalizador";

export interface EstiloPilulaInfo {
  id: IdEstiloPilula;
  nome: string;
  descricao: string;
}

export const ESTILOS_PILULA: readonly EstiloPilulaInfo[] = [
  { id: "original", nome: "Original", descricao: "Preta, com a onda branca." },
  { id: "vidro", nome: "Vidro", descricao: "Branca translúcida; quase some em fundos claros." },
  { id: "azul", nome: "Azul FalaAi", descricao: "No azul da marca." },
  { id: "aurora", nome: "Aurora", descricao: "Degradê roxo e azul que se move devagar." },
  { id: "neon", nome: "Neon", descricao: "Preta com barras ciano e rosa brilhando." },
  { id: "por-do-sol", nome: "Pôr do sol", descricao: "Degradê laranja e rosa." },
  { id: "equalizador", nome: "Equalizador", descricao: "Preta, com cada barra de uma cor." },
];

export const ESTILO_PILULA_PADRAO = { tipo: "estilo", id: "original" } as const;

export function infoEstiloPilula(id: string): EstiloPilulaInfo | undefined {
  return ESTILOS_PILULA.find((e) => e.id === id);
}
