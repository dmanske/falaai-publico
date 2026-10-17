// Sugestões de atalho, conversão de KeyboardEvent.code para os nomes de src/shared/atalhos.ts e validação.
import type { Atalho, IdAtalho } from "@shared/atalhos";
import { NOMES_ATALHOS } from "@shared/atalhos";

export const SUGESTOES: Record<"darwin" | "win32", Atalho[]> = {
  darwin: [
    ["Fn"],
    ["Fn", "Space"],
    ["Fn", "ShiftLeft"],
    ["OptionRight"],
    ["CmdRight"],
    ["Ctrl", "Option"],
    ["Ctrl", "Cmd", "V"],
    ["Cmd", "ShiftLeft", "Space"],
  ],
  win32: [
    ["AltRight"],
    ["AltRight", "Space"],
    ["AltRight", "ShiftRight"],
    ["CtrlRight"],
    ["CtrlLeft", "AltLeft"],
    ["CtrlLeft", "ShiftRight", "V"],
    ["CtrlLeft", "AltLeft", "V"],
  ],
};

const MODIFICADORES = new Set(["Ctrl", "CtrlLeft", "CtrlRight", "Option", "OptionLeft", "OptionRight", "Alt", "AltLeft", "AltRight", "Cmd", "CmdLeft", "CmdRight", "Win", "Shift", "ShiftLeft", "ShiftRight", "Fn"]);
export const ehModificador = (t: string) => MODIFICADORES.has(t);

/** event.code → nome de tecla do contrato; null = tecla sem suporte. */
export function codigoParaTecla(code: string, plataforma: string): string | null {
  const mac = plataforma !== "win32";
  const mapa: Record<string, string> = {
    ControlLeft: "CtrlLeft",
    ControlRight: "CtrlRight",
    ShiftLeft: "ShiftLeft",
    ShiftRight: "ShiftRight",
    AltLeft: mac ? "OptionLeft" : "AltLeft",
    AltRight: mac ? "OptionRight" : "AltRight",
    MetaLeft: mac ? "CmdLeft" : "Win",
    MetaRight: mac ? "CmdRight" : "Win",
    Space: "Space",
    Enter: "Enter",
    Tab: "Tab",
    Escape: "Esc",
  };
  if (mapa[code]) return mapa[code];
  let m = /^Key([A-Z])$/.exec(code);
  if (m) return m[1];
  m = /^Digit([0-9])$/.exec(code);
  if (m) return m[1];
  if (/^F([1-9]|1[0-9]|20)$/.test(code)) return code;
  return null;
}

const chave = (a: Atalho) => [...a].sort().join("+");

/** Mensagem de erro se o atalho for inválido ou já estiver em uso por outra função; senão null. */
export function validarAtalho(id: IdAtalho, novo: Atalho, todos: Record<IdAtalho, Atalho>): string | null {
  if (novo.length === 0) return "Escolha pelo menos uma tecla.";
  if (novo.filter((t) => !ehModificador(t)).length > 1) return "Use no máximo uma tecla comum (letra, número, Espaço…).";
  for (const outro of Object.keys(todos) as IdAtalho[]) {
    if (outro !== id && chave(todos[outro]) === chave(novo)) return `Esse atalho já é usado em "${NOMES_ATALHOS[outro]}".`;
  }
  return null;
}
