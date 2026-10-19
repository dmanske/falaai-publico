// Atalhos de teclado: nomes de teclas e atalhos padrão por sistema.
// O auxiliar nativo (Mac: nativo/macos; Windows: nativo/windows) entende exatamente estes nomes.

export type IdAtalho = "ditado" | "pergunte" | "traducao" | "colarUltima";

/**
 * Atalho = lista de teclas que, seguradas juntas, disparam a função.
 * Modificadores: Fn, Ctrl, CtrlLeft, CtrlRight, Option, OptionLeft, OptionRight (Windows: Alt*),
 * Cmd, CmdLeft, CmdRight (Windows: Win*), Shift, ShiftLeft, ShiftRight.
 * No máximo uma tecla comum: Space, A–Z, 0–9, F1–F20, Enter, Tab, Esc.
 * Botões extras do mouse (só Mac, auxiliar v4): Mouse3 (meio), Mouse4, Mouse5 — contam como a tecla
 * comum, podem ficar sozinhos (como F1–F20) e valem com Duplo.
 * "Ctrl"/"Option"/"Cmd"/"Shift" sem lado aceitam qualquer um dos dois lados.
 * Toque duplo: ["Duplo", X] — tocar X duas vezes rápido (X = uma tecla qualquer).
 */
export type Atalho = string[];

/** Marcador de toque duplo (protocolo v3 do auxiliar nativo). */
export const DUPLO = "Duplo";

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
  Mouse3: "Botão do meio",
  Mouse4: "Botão 4 do mouse",
  Mouse5: "Botão 5 do mouse",
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
  if (tecla === DUPLO) return "2×";
  const tabela = plataforma === "win32" ? ROTULOS_WIN : ROTULOS_MAC;
  return tabela[tecla] ?? tecla;
}

// ── Validação (usada pela tela de Configurações; regras do protocolo v3) ─────────────────────────

const MODIFICADORES = new Set([
  "Fn", "Ctrl", "CtrlLeft", "CtrlRight", "Option", "OptionLeft", "OptionRight", "Alt", "AltLeft", "AltRight",
  "Cmd", "CmdLeft", "CmdRight", "Win", "Shift", "ShiftLeft", "ShiftRight",
]);
export const ehModificador = (t: string) => MODIFICADORES.has(t);
const ehTeclaF = (t: string) => /^F([1-9]|1[0-9]|20)$/.test(t);
/** Botão extra do mouse (só Mac por enquanto). */
export const ehBotaoMouse = (t: string) => t === "Mouse3" || t === "Mouse4" || t === "Mouse5";
/** Teclas que digitam algo: no toque duplo, o primeiro toque chega a escrever o caractere. */
const digita = (t: string) => /^[A-Z0-9]$/.test(t) || t === "Space" || t === "Tab";

const chave = (a: Atalho) => (a[0] === DUPLO ? `${DUPLO}:${a[1]}` : [...a].sort().join("+"));

export interface ResultadoValidacao {
  /** Impede salvar. */
  erro: string | null;
  /** Salva, mas avisa (ex.: toque duplo de letra). */
  aviso: string | null;
}

export function validarAtalho(
  id: IdAtalho,
  novo: Atalho,
  todos: Record<IdAtalho, Atalho>,
  plataforma: string = "darwin",
): ResultadoValidacao {
  const ok = (aviso: string | null = null): ResultadoValidacao => ({ erro: null, aviso });
  const falha = (erro: string): ResultadoValidacao => ({ erro, aviso: null });
  if (novo.length === 0) return falha("Escolha pelo menos uma tecla.");

  const duplo = novo[0] === DUPLO;
  if (novo.indexOf(DUPLO, 1) > 0) return falha("O toque duplo vale para uma tecla só.");
  if (duplo && novo.length !== 2) return falha("O toque duplo vale para uma tecla só.");

  const teclas = duplo ? novo.slice(1) : novo;
  if (plataforma === "win32" && teclas.some(ehBotaoMouse)) return falha("Botões do mouse só funcionam no Mac por enquanto.");
  const comuns = teclas.filter((t) => !ehModificador(t));
  if (comuns.length > 1) return falha("Use no máximo uma tecla comum (letra, número, Espaço…).");
  if (!duplo && teclas.length === 1 && comuns.length === 1 && !ehTeclaF(comuns[0]) && !ehBotaoMouse(comuns[0])) {
    return falha("Uma tecla comum sozinha digitaria texto. Combine com um modificador ou use toque duplo.");
  }

  for (const outro of Object.keys(todos) as IdAtalho[]) {
    if (outro === id) continue;
    const dele = todos[outro];
    if (chave(dele) === chave(novo)) return falha(`Esse atalho já é usado em "${NOMES_ATALHOS[outro]}".`);
    // Toque duplo de X e "segurar X" na mesma tecla brigariam: o 1º toque já dispararia o outro.
    const alvo = duplo ? novo[1] : novo.length === 1 ? novo[0] : null;
    const doOutro = dele[0] === DUPLO ? dele[1] : dele.length === 1 ? dele[0] : null;
    if (alvo && doOutro === alvo && (duplo || dele[0] === DUPLO)) {
      return falha(`A tecla já é usada em "${NOMES_ATALHOS[outro]}" (segurar e toque duplo na mesma tecla se atrapalham).`);
    }
  }

  if (duplo && digita(novo[1])) {
    return ok(
      "Toque duplo em letra/número: o FalaAi apaga a letra do 1º toque sozinho, mas palavras com letra dobrada (ex.: Isaac, cooperar) também disparam. Prefira uma tecla modificadora.",
    );
  }
  return ok();
}
