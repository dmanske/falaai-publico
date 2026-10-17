// Leitura e gravação de arquivos JSON pequenos na pasta de dados do app (userData).
import { app } from "electron";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function caminho(nome: string): string {
  return join(app.getPath("userData"), nome);
}

export function lerJson<T>(nome: string, padrao: T): T {
  const arq = caminho(nome);
  if (!existsSync(arq)) return padrao;
  try {
    return { ...padrao, ...JSON.parse(readFileSync(arq, "utf8")) };
  } catch {
    return padrao;
  }
}

/** Grava num arquivo temporário e renomeia: nunca deixa o JSON pela metade. */
export function gravarJson(nome: string, dados: unknown): void {
  const arq = caminho(nome);
  writeFileSync(`${arq}.tmp`, JSON.stringify(dados, null, 2), "utf8");
  renameSync(`${arq}.tmp`, arq);
}
