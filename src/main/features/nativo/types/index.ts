// Protocolo com o auxiliar nativo (JSON por linha), versão 4.
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
    /** Auxiliar v4: o campo aceita texto? Ausente em versões antigas. */
    editavel?: boolean;
    /** Auxiliar v4: como o campo foi lido ("nenhuma" = a Acessibilidade não enxergou o campo). */
    leitura?: "valor" | "marcador" | "nenhuma";
  } | null;
  /** Auxiliar v4: mensagens em volta do campo (só se pedidas em `extras.conversa`). */
  conversa?: { antes: string; depois: string } | null;
  /** Auxiliar v4: texto visível da janela (só se pedido em `extras.tela`). */
  tela?: string | null;
  /** Auxiliar v4: a árvore de acessibilidade do app acabou de ser ligada; a leitura deste pedido não vale. */
  acessibilidadeLigada?: boolean;
}

/** Extras do pedido de contexto (auxiliar v4). Zero = não ler aquela parte. */
export interface ExtrasContexto {
  antes?: number;
  depois?: number;
  conversa?: number;
  tela?: number;
  ligarAcessibilidade?: boolean;
  naoLigarEm?: string[];
}

/** Entrada de áudio listada pelo auxiliar (v4). `transporte` pode vir com valores novos (ex.: "iphone"). */
export interface EntradaAudioNativa {
  nome: string;
  uid: string;
  transporte: string;
  padrao: boolean;
  vivo: boolean;
}

export interface TecladoNativo {
  nome: string;
  embutido: boolean;
}

export type ComandoAuxiliar =
  | { cmd: "permissoes"; pedir: boolean }
  | { cmd: "iniciar_teclado" }
  | { cmd: "parar_teclado" }
  | { cmd: "configurar_atalhos"; atalhos: { id: IdAtalho; teclas: Atalho }[] }
  | { cmd: "colar"; texto: string; html?: string }
  | { cmd: "apertar_enter" }
  | { cmd: "contexto"; pid?: number; extras?: ExtrasContexto }
  | { cmd: "ler_campo" }
  | { cmd: "copiar_selecao"; prazoMs?: number }
  | { cmd: "dispositivos_audio" }
  | { cmd: "teclados" }
  | { cmd: "capturar_atalho" }
  | { cmd: "cancelar_captura" }
  | { cmd: "mutar_saida" }
  | { cmd: "desmutar_saida" }
  | { cmd: "sair" };
