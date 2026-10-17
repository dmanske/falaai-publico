// Limpeza da chave colada. Mesmo problema do almoxarifado (09/10/2026) e do FalaAi (17/10/2026):
// a chave foi colada com a linha de baixo do .env junto — `…=="` + quebra + `LOVABLE_AI_MODEL="…"`
// — e a Lovable respondia 401. Cópia deliberada de
// almoxarifado_manske_oficial/supabase/functions/_shared/agente-ia/chaves.ts (limparChave);
// mudar as duas juntas. Sem imports: testada com node --test.

/**
 * Tira do texto colado só a chave: 1ª linha que não é comentário, sem `export NOME=` na frente,
 * sem aspas e sem nada depois de espaço. Chaves terminam em "==" (base64), então o `=` só conta
 * depois de um NOME em maiúsculas.
 */
export function limparChave(bruto: string): string {
  const linha =
    String(bruto ?? "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l && !l.startsWith("#")) ?? "";
  let v = linha.replace(/^export\s+/, "");
  const nomeado = v.match(/^[A-Z][A-Z0-9_]*\s*=\s*(.+)$/);
  if (nomeado) v = nomeado[1];
  v = v.replace(/^["'`]/, "");
  const aspas = v.search(/["'`]/);
  if (aspas >= 0) v = v.slice(0, aspas);
  return v.trim().split(/\s/)[0] ?? "";
}
