// Protocolo com o auxiliar nativo (JSON por linha). Especificação: nativo/macos/README.md.

export type EventoAuxiliar =
  | { evento: "pronto"; versao: number }
  | { evento: "fn"; estado: "desce" | "sobe" }
  | { evento: "fn_combinado" }
  | { evento: "esc" }
  | { evento: "colar_ultima" };

export interface RespostaAuxiliar {
  id: number | null;
  ok: boolean;
  erro?: string;
  [campo: string]: unknown;
}

export type ComandoAuxiliar =
  | { cmd: "permissoes"; pedir: boolean }
  | { cmd: "iniciar_teclado" }
  | { cmd: "parar_teclado" }
  | { cmd: "colar"; texto: string }
  | { cmd: "sair" };
