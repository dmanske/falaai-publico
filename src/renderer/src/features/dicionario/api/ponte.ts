// Acesso ao processo principal a partir deste módulo. Único lugar que toca em window.ponte.
export const apiDicionario = window.ponte.dicionario;

/** O Electron embrulha o erro ("Error invoking remote method ...: Error: msg"); devolve só a msg. */
export function mensagemDeErro(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  const i = msg.lastIndexOf("Error: ");
  return (i >= 0 ? msg.slice(i + 7) : msg) || "Algo deu errado.";
}
