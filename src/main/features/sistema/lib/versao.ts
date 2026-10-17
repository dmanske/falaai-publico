// Comparação simples de versões (semver sem pré-lançamento): "v0.2.0" > "0.1.9".
function partes(v: string): number[] {
  return v
    .trim()
    .replace(/^v/i, "")
    .split("-")[0]
    .split(".")
    .map((p) => parseInt(p, 10) || 0);
}

/** true se `nova` é maior que `atual`. */
export function ehMaisNova(nova: string, atual: string): boolean {
  const a = partes(nova);
  const b = partes(atual);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}
