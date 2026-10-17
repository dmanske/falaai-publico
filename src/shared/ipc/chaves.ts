export const CANAIS_CHAVES = {
  STATUS: "chaves:status",
  SALVAR: "chaves:salvar",
  APAGAR: "chaves:apagar",
} as const;

export type NomeChave = "lovable";

/** O que a tela pode saber de uma chave: nunca o valor inteiro. */
export interface StatusChave {
  configurada: boolean;
  /** Últimos 4 caracteres, para o usuário reconhecer qual chave está salva. */
  final: string | null;
}

export interface PonteChaves {
  status(nome: NomeChave): Promise<StatusChave>;
  salvar(nome: NomeChave, valor: string): Promise<StatusChave>;
  apagar(nome: NomeChave): Promise<StatusChave>;
}
