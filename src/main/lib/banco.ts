// Banco local (SQLite embutido no Node do Electron: node:sqlite — sem módulo nativo para compilar).
// Arquivo: <userData>/falaai.db. Cada módulo cuida das próprias tabelas com migrar().
import { app } from "electron";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

let db: DatabaseSync | null = null;

export function banco(): DatabaseSync {
  if (!db) {
    db = new DatabaseSync(join(app.getPath("userData"), "falaai.db"));
    db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
    db.exec("CREATE TABLE IF NOT EXISTS _migracoes (modulo TEXT PRIMARY KEY, versao INTEGER NOT NULL)");
  }
  return db;
}

/**
 * Aplica as migrações de um módulo que ainda não rodaram. `migracoes[i]` é a versão i+1;
 * NUNCA alterar uma migração já publicada — só acrescentar no fim da lista.
 */
export function migrar(modulo: string, migracoes: string[]): void {
  const d = banco();
  const linha = d.prepare("SELECT versao FROM _migracoes WHERE modulo = ?").get(modulo) as { versao: number } | undefined;
  const atual = linha?.versao ?? 0;
  for (let i = atual; i < migracoes.length; i++) {
    d.exec("BEGIN");
    try {
      d.exec(migracoes[i]);
      d.prepare("INSERT INTO _migracoes (modulo, versao) VALUES (?, ?) ON CONFLICT(modulo) DO UPDATE SET versao = excluded.versao").run(
        modulo,
        i + 1,
      );
      d.exec("COMMIT");
    } catch (e) {
      d.exec("ROLLBACK");
      throw new Error(`Migração ${i + 1} do módulo ${modulo} falhou: ${(e as Error).message}`);
    }
  }
}

export function fecharBanco(): void {
  db?.close();
  db = null;
}
