// Protocolo com o auxiliar nativo (JSON por linha), versão 2.
// Especificação completa: docs/design/PROTOCOLO_AUXILIAR.md.
import type { Atalho, IdAtalho } from "@shared/atalhos";

export type EventoAuxiliar =
  | { evento: "pronto"; versao: number }
  | { evento: "atalho"; id: IdAtalho; estado: "desce" | "sobe" }
  | { evento: "combinado" }
  | { evento: "esc" };

export interface RespostaAuxiliar {
  id: number | null;
  ok: boolean;
  erro?: string;
  [campo: string]: unknown;
}

export interface ContextoApp {
  app: { nome: string; appId: string | null; janela: string | null } | null;
  navegador: { url: string | null; titulo: string | null } | null;
  campo: {
    papel: string | null;
    placeholder: string | null;
    antes: string;
    depois: string;
    selecionado: string;
  } | null;
}

export type ComandoAuxiliar =
  | { cmd: "permissoes"; pedir: boolean }
  | { cmd: "iniciar_teclado" }
  | { cmd: "parar_teclado" }
  | { cmd: "configurar_atalhos"; atalhos: { id: IdAtalho; teclas: Atalho }[] }
  | { cmd: "colar"; texto: string }
  | { cmd: "contexto" }
  | { cmd: "ler_campo" }
  | { cmd: "capturar_atalho" }
  | { cmd: "cancelar_captura" }
  | { cmd: "mutar_saida" }
  | { cmd: "desmutar_saida" }
  | { cmd: "sair" };
