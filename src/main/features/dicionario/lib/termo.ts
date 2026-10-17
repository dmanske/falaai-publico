// Validação de um termo do dicionário (função pura).
export const TERMO_MAX = 60;

/** Devolve o termo aparado e válido, ou a mensagem de erro em português. */
export function validarTermo(bruto: unknown): { termo: string } | { erro: string } {
  const termo = String(bruto ?? "").trim();
  if (termo.length === 0) return { erro: "Digite uma palavra." };
  if (/[\r\n]/.test(termo)) return { erro: "A palavra não pode ter quebra de linha." };
  if ([...termo].length > TERMO_MAX) return { erro: `A palavra pode ter no máximo ${TERMO_MAX} caracteres.` };
  return { termo };
}

export const ERRO_DUPLICADO = "Essa palavra já está no dicionário.";
