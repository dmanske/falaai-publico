// ESQUELETO — preenchido pelo agente do Dicionário. Assinaturas fixas (usadas pelo ditado).

/** Cria as tabelas. Chamado uma vez no início do app. */
export function iniciarDicionario(): void {}

/** Termos do dicionário para mandar no prompt da IA (escrever sempre assim). */
export function palavrasParaPrompt(): string[] {
  return [];
}

/**
 * Chamado logo depois de colar um ditado. Se preferencias.aprenderCorrecoes, observa o campo em foco
 * por alguns segundos (auxiliar nativo: cmd "ler_campo") e aprende palavras que o usuário corrigiu.
 * Avisa ao aprender (callback) para a pílula mostrar "Adicionada ao dicionário: X".
 */
export function observarEdicao(_textoColado: string, _appId: string | null, _aoAprender: (termos: string[]) => void): void {}
