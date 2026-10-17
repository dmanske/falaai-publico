export const CANAIS_PERMISSOES = {
  LER: "permissoes:ler",
  PEDIR: "permissoes:pedir",
} as const;

export interface StatusPermissoes {
  plataforma: string;
  microfone: "concedida" | "negada" | "nao-perguntada" | "restrita" | "desconhecida";
  /** Acessibilidade (Mac): ler o teclado e colar. null = auxiliar nativo indisponível. */
  acessibilidade: boolean | null;
  /** Leitura do teclado ativa (atalhos funcionando). */
  tecladoAtivo: boolean;
  /**
   * Mac: o que a tecla 🌐/Fn faz sozinha (Ajustes > Teclado). "nada" é o ideal; "emoji",
   * "ditado" ou "idioma" atrapalham o FalaAi. null = não se aplica / não deu para ler.
   */
  teclaFnDoSistema: "nada" | "idioma" | "emoji" | "ditado" | null;
  /** Mensagem de erro do auxiliar nativo, se ele não subiu. */
  erroAuxiliar: string | null;
}

export type PermissaoPedida = "microfone" | "acessibilidade" | "ajustes-teclado";

export interface PontePermissoes {
  ler(): Promise<StatusPermissoes>;
  pedir(qual: PermissaoPedida): Promise<StatusPermissoes>;
}
