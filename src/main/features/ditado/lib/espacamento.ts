// Ajustes finais do texto antes de colar, conforme o que já está no campo. Sem imports: testável.

/**
 * Se o cursor está logo depois de uma palavra ou pontuação (sem espaço), começa com um espaço,
 * para o ditado não grudar no texto anterior ("Olá,tudo bem"). Não mexe quando o texto anterior
 * termina em espaço, quebra de linha, ou abre parênteses/aspas, nem quando o campo está vazio.
 */
export function ajustarEspacoInicial(antesDoCursor: string, texto: string): string {
  if (!texto || !antesDoCursor) return texto;
  const ultimo = antesDoCursor.slice(-1);
  if (/\s/.test(ultimo) || /[([{"'“‘«/@#-]/.test(ultimo)) return texto;
  if (/^[\s.,;:!?)\]}»”’]/.test(texto)) return texto;
  return ` ${texto}`;
}

/** Conta palavras de um texto (para o histórico e as estatísticas). */
export function contarPalavras(texto: string): number {
  return texto.trim() ? texto.trim().split(/\s+/).length : 0;
}
