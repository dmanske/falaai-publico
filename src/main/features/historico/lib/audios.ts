// Arquivos de áudio (WAV) dos ditados, em <userData>/audios/<id>.wav.
import { app } from "electron";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

function pasta(): string {
  const p = join(app.getPath("userData"), "audios");
  mkdirSync(p, { recursive: true });
  return p;
}

/** Grava o WAV e devolve o nome do arquivo (é o que vai para o banco). */
export function gravarAudio(id: string, wav: Buffer): string {
  const nome = `${id}.wav`;
  writeFileSync(join(pasta(), nome), wav);
  return nome;
}

/** basename() impede que um valor estranho no banco aponte para fora da pasta de áudios. */
export function lerAudio(nome: string): Buffer | null {
  const arq = join(pasta(), basename(nome));
  return existsSync(arq) ? readFileSync(arq) : null;
}

export function apagarAudio(nome: string | null): void {
  if (!nome) return;
  try {
    rmSync(join(pasta(), basename(nome)), { force: true });
  } catch (e) {
    console.warn("[historico] não consegui apagar o áudio", nome, e);
  }
}
