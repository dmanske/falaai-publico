// Sugestões de atalho prontas (a validação fica em src/shared/atalhos.ts: validarAtalho).
import type { Atalho } from "@shared/atalhos";

export const SUGESTOES: Record<"darwin" | "win32", Atalho[]> = {
  darwin: [
    ["Fn"],
    ["Fn", "Space"],
    ["Fn", "ShiftLeft"],
    ["Duplo", "OptionRight"],
    ["Duplo", "CmdRight"],
    ["Duplo", "Fn"],
    ["Duplo", "ShiftRight"],
    ["OptionRight"],
    ["CmdRight"],
    ["Ctrl", "Option"],
    ["Ctrl", "Cmd", "V"],
  ],
  win32: [
    ["AltRight"],
    ["AltRight", "Space"],
    ["AltRight", "ShiftRight"],
    ["Duplo", "AltRight"],
    ["Duplo", "CtrlRight"],
    ["Duplo", "ShiftRight"],
    ["CtrlRight"],
    ["CtrlLeft", "AltLeft"],
    ["CtrlLeft", "ShiftRight", "V"],
  ],
};
