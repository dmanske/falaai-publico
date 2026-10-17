// Acesso ao SQLite do dicionário (só SQL; regras de texto ficam em lib/).
import { randomUUID } from "node:crypto";
import { BrowserWindow } from "electron";
import { CANAIS_DICIONARIO, type PalavraDicionario, type ResultadoImportacao } from "@shared/ipc";
import { banco, migrar } from "../../lib/banco";
import { lerLista } from "./lib/csv";
import { ERRO_DUPLICADO, validarTermo } from "./lib/termo";

type Origem = PalavraDicionario["origem"];

interface Linha {
  id: string;
  termo: string;
  origem: Origem;
  criada_em: string;
}

const MAX_PROMPT = 500;

export function criarTabela(): void {
  migrar("dicionario", [
    `CREATE TABLE dicionario (
       id TEXT PRIMARY KEY,
       termo TEXT NOT NULL UNIQUE COLLATE NOCASE,
       origem TEXT NOT NULL DEFAULT 'manual',
       criada_em TEXT NOT NULL
     )`,
  ]);
}

const paraPalavra = (l: Linha): PalavraDicionario => ({ id: l.id, termo: l.termo, origem: l.origem, criadaEm: l.criada_em });

/** Avisa todas as janelas que a lista mudou. */
export function avisarMudou(): void {
  for (const j of BrowserWindow.getAllWindows()) {
    if (!j.isDestroyed()) j.webContents.send(CANAIS_DICIONARIO.MUDOU);
  }
}

export function listar(busca?: string): PalavraDicionario[] {
  const q = (busca ?? "").trim();
  const linhas = q
    ? banco()
        .prepare("SELECT * FROM dicionario WHERE termo LIKE ? ESCAPE '\\' ORDER BY criada_em DESC, rowid DESC")
        .all(`%${q.replace(/[\\%_]/g, "\\$&")}%`)
    : banco().prepare("SELECT * FROM dicionario ORDER BY criada_em DESC, rowid DESC").all();
  return (linhas as unknown as Linha[]).map(paraPalavra);
}

export function termosParaPrompt(): string[] {
  const linhas = banco().prepare("SELECT termo FROM dicionario ORDER BY criada_em DESC, rowid DESC LIMIT ?").all(MAX_PROMPT);
  return (linhas as unknown as { termo: string }[]).map((l) => l.termo);
}

const ehDuplicado = (e: unknown) => /UNIQUE/i.test((e as Error)?.message ?? "");

/** Insere sem avisar as janelas. Lança Error em português se inválido/duplicado. */
export function inserir(bruto: unknown, origem: Origem): PalavraDicionario {
  const v = validarTermo(bruto);
  if ("erro" in v) throw new Error(v.erro);
  const linha: Linha = { id: randomUUID(), termo: v.termo, origem, criada_em: new Date().toISOString() };
  try {
    banco().prepare("INSERT INTO dicionario (id, termo, origem, criada_em) VALUES (?, ?, ?, ?)").run(linha.id, linha.termo, linha.origem, linha.criada_em);
  } catch (e) {
    if (ehDuplicado(e)) throw new Error(ERRO_DUPLICADO);
    throw e;
  }
  return paraPalavra(linha);
}

export function existe(termo: string): boolean {
  return banco().prepare("SELECT 1 FROM dicionario WHERE termo = ?").get(termo) !== undefined;
}

export function atualizar(id: string, bruto: unknown): PalavraDicionario {
  const v = validarTermo(bruto);
  if ("erro" in v) throw new Error(v.erro);
  try {
    const r = banco().prepare("UPDATE dicionario SET termo = ? WHERE id = ?").run(v.termo, String(id));
    if (r.changes === 0) throw new Error("Essa palavra não existe mais.");
  } catch (e) {
    if (ehDuplicado(e)) throw new Error(ERRO_DUPLICADO);
    throw e;
  }
  const linha = banco().prepare("SELECT * FROM dicionario WHERE id = ?").get(String(id)) as unknown as Linha;
  return paraPalavra(linha);
}

export function apagar(ids: unknown): void {
  if (!Array.isArray(ids) || ids.length === 0) return;
  const d = banco();
  const stmt = d.prepare("DELETE FROM dicionario WHERE id = ?");
  d.exec("BEGIN");
  try {
    for (const id of ids) stmt.run(String(id));
    d.exec("COMMIT");
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}

export function importar(conteudo: unknown): ResultadoImportacao {
  const lida = lerLista(String(conteudo ?? ""));
  let adicionadas = 0;
  let ignoradas = lida.ignoradas;
  const d = banco();
  d.exec("BEGIN");
  try {
    for (const termo of lida.termos) {
      try {
        inserir(termo, "importada");
        adicionadas++;
      } catch {
        ignoradas++; // já existia
      }
    }
    d.exec("COMMIT");
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
  return { adicionadas, ignoradas };
}
