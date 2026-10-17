// Atalhos de teclado: nomes de teclas e atalhos padrão por sistema.
// O auxiliar nativo (Mac: nativo/macos; Windows: nativo/windows) entende exatamente estes nomes.

export type IdAtalho = "ditado" | "pergunte" | "traducao" | "colarUltima";

/**
 * Atalho = lista de teclas que, seguradas juntas, disparam a função.
 * Modificadores: Fn, Ctrl, CtrlLeft, CtrlRight, Option, OptionLeft, OptionRight (Windows: Alt*),
 * Cmd, CmdLeft, CmdRight (Windows: Win*), Shift, ShiftLeft, ShiftRight.
 * No máximo uma tecla comum: Space, A–Z, 0–9, F1–F20, Enter, Tab, Esc.
 * "Ctrl"/"Option"/"Cmd"/"Shift" sem lado aceitam qualquer um dos dois lados.
 */
export type Atalho = string[];

export const NOMES_ATALHOS: Record<IdAtalho, string> = {
  ditado: "Ditado",
  pergunte: "Pergunte qualquer coisa",
  traducao: "Traduzir",
  colarUltima: "Colar a última transcrição",
};

export const ATALHOS_PADRAO: Record<"darwin" | "win32", Record<IdAtalho, Atalho>> = {
  darwin: {
    ditado: ["Fn"],
    pergunte: ["Fn", "Space"],
    traducao: ["Fn", "ShiftLeft"],
    colarUltima: ["Ctrl", "Cmd", "V"],
  },
  win32: {
    ditado: ["AltRight"],
    pergunte: ["AltRight", "Space"],
    traducao: ["AltRight", "ShiftRight"],
    colarUltima: ["CtrlLeft", "ShiftRight", "V"],
  },
};

export function atalhosPadrao(plataforma: string): Record<IdAtalho, Atalho> {
  return plataforma === "win32" ? ATALHOS_PADRAO.win32 : ATALHOS_PADRAO.darwin;
}

/** Rótulo curto de cada tecla para mostrar na tela (ex.: ["Fn","ShiftLeft"] → "Fn ⇧ esq."). */
const ROTULOS_MAC: Record<string, string> = {
  Fn: "Fn",
  Ctrl: "⌃",
  CtrlLeft: "⌃ esq.",
  CtrlRight: "⌃ dir.",
  Option: "⌥",
  OptionLeft: "⌥ esq.",
  OptionRight: "⌥ dir.",
  Cmd: "⌘",
  CmdLeft: "⌘ esq.",
  CmdRight: "⌘ dir.",
  Shift: "⇧",
  ShiftLeft: "⇧ esq.",
  ShiftRight: "⇧ dir.",
  Space: "Espaço",
  Enter: "↩",
  Tab: "⇥",
  Esc: "Esc",
};
const ROTULOS_WIN: Record<string, string> = {
  Ctrl: "Ctrl",
  CtrlLeft: "Ctrl esq.",
  CtrlRight: "Ctrl dir.",
  Alt: "Alt",
  AltLeft: "Alt esq.",
  AltRight: "Alt dir.",
  Win: "Win",
  Shift: "Shift",
  ShiftLeft: "Shift esq.",
  ShiftRight: "Shift dir.",
  Space: "Espaço",
  Enter: "Enter",
  Tab: "Tab",
  Esc: "Esc",
};

export function rotuloTecla(tecla: string, plataforma: string): string {
  const tabela = plataforma === "win32" ? ROTULOS_WIN : ROTULOS_MAC;
  return tabela[tecla] ?? tecla;
}
