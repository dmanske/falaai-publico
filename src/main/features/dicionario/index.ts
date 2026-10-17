// Dicionário pessoal: termos que a IA deve escrever sempre do mesmo jeito.
// Assinaturas exportadas são usadas pelo ditado — não mudar.
import { observar } from "./observador";
import { criarTabela, termosParaPrompt } from "./repositorio";

/** Cria as tabelas. Chamado uma vez no início do app. */
export function iniciarDicionario(): void {
  criarTabela();
}

/** Termos do dicionário para mandar no prompt da IA (escrever sempre assim). Até 500, mais recentes primeiro. */
export function palavrasParaPrompt(): string[] {
  try {
    return termosParaPrompt();
  } catch (e) {
    console.error("[dicionario] palavrasParaPrompt:", e);
    return [];
  }
}

/**
 * Chamado logo depois de colar um ditado. Se preferencias.aprenderCorrecoes, observa o campo em foco
 * por alguns segundos (auxiliar nativo: cmd "ler_campo") e aprende palavras que o usuário corrigiu.
 * Avisa ao aprender (callback) para a pílula mostrar "Adicionada ao dicionário: X".
 */
export function observarEdicao(textoColado: string, appId: string | null, aoAprender: (termos: string[]) => void): void {
  try {
    observar(textoColado, appId, aoAprender);
  } catch (e) {
    console.error("[dicionario] observarEdicao:", e);
  }
}
