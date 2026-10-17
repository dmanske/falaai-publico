// Conta palavras de um texto: sequências separadas por espaço. Pontuação colada na palavra não conta à parte.
export function contarPalavras(texto: string): number {
  // Só conta pedaços que tenham ao menos uma letra ou número (ignora "-", "—", "..." soltos).
  return texto
    .split(/\s+/)
    .filter((p) => /[\p{L}\p{N}]/u.test(p)).length;
}
