// Processo auxiliar nativo (Swift no Mac; Rust no Windows na F5): teclado global e colar texto.
// Roda separado do Electron — se travar, o app não cai — e conversa por JSON, uma linha por mensagem.
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync } from "node:fs";
import { EventEmitter } from "node:events";
import { createInterface } from "node:readline";
import { caminhoRecurso } from "../../lib/recursos";
import type { ComandoAuxiliar, EventoAuxiliar, RespostaAuxiliar } from "./types";

const BINARIOS: Partial<Record<NodeJS.Platform, string>> = {
  darwin: "bin/falaai-auxiliar-mac",
  win32: "bin/falaai-auxiliar-win.exe",
};
/** Tempo máximo de resposta a um comando (ms). */
const TIMEOUT_COMANDO_MS = 5000;
/** Espera antes de subir de novo um auxiliar que caiu (ms). */
const ESPERA_REINICIO_MS = 2000;

class Auxiliar extends EventEmitter<{ evento: [EventoAuxiliar]; caiu: [string] }> {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private proximoId = 1;
  private pendentes = new Map<number, { resolver: (r: RespostaAuxiliar) => void; timer: NodeJS.Timeout }>();
  private encerrando = false;
  /** Motivo pelo qual o auxiliar não está disponível (null = está ok). */
  erro: string | null = null;

  get disponivel(): boolean {
    return this.proc !== null;
  }

  iniciar(): void {
    const rel = BINARIOS[process.platform];
    if (!rel) {
      this.erro = "Auxiliar nativo ainda não existe para este sistema (Windows chega na F5).";
      return;
    }
    const caminho = caminhoRecurso(rel);
    if (!existsSync(caminho)) {
      this.erro = `Auxiliar nativo não encontrado (${rel}). Rode: npm run nativo:mac`;
      return;
    }
    const proc = spawn(caminho, [], { stdio: ["pipe", "pipe", "pipe"] });
    this.proc = proc;
    this.erro = null;

    createInterface({ input: proc.stdout }).on("line", (linha) => this.receber(linha));
    proc.stderr.on("data", (d: Buffer) => console.error("[auxiliar]", d.toString().trim()));
    proc.on("exit", (codigo) => {
      this.proc = null;
      for (const p of this.pendentes.values()) {
        clearTimeout(p.timer);
        p.resolver({ id: null, ok: false, erro: "O auxiliar nativo encerrou." });
      }
      this.pendentes.clear();
      if (this.encerrando) return;
      this.erro = `O auxiliar nativo caiu (código ${codigo}). Reiniciando…`;
      this.emit("caiu", this.erro);
      setTimeout(() => this.iniciar(), ESPERA_REINICIO_MS);
    });
  }

  private receber(linha: string): void {
    let msg: (RespostaAuxiliar & { evento?: undefined }) | EventoAuxiliar;
    try {
      msg = JSON.parse(linha);
    } catch {
      console.error("[auxiliar] linha inválida:", linha);
      return;
    }
    if ("evento" in msg && msg.evento) {
      this.emit("evento", msg as EventoAuxiliar);
      return;
    }
    const resp = msg as RespostaAuxiliar;
    const p = resp.id != null ? this.pendentes.get(resp.id) : undefined;
    if (!p) return;
    clearTimeout(p.timer);
    this.pendentes.delete(resp.id!);
    p.resolver(resp);
  }

  /** `timeoutMs`: comandos longos (ex.: capturar_atalho, até 10 s) passam um prazo maior. */
  enviar(comando: ComandoAuxiliar, timeoutMs = TIMEOUT_COMANDO_MS): Promise<RespostaAuxiliar> {
    const proc = this.proc;
    if (!proc) return Promise.resolve({ id: null, ok: false, erro: this.erro ?? "Auxiliar nativo indisponível." });
    const id = this.proximoId++;
    return new Promise((resolver) => {
      const timer = setTimeout(() => {
        this.pendentes.delete(id);
        resolver({ id, ok: false, erro: "O auxiliar nativo não respondeu a tempo." });
      }, timeoutMs);
      this.pendentes.set(id, { resolver, timer });
      proc.stdin.write(`${JSON.stringify({ id, ...comando })}\n`);
    });
  }

  encerrar(): void {
    this.encerrando = true;
    if (this.proc) {
      void this.enviar({ cmd: "sair" });
      setTimeout(() => this.proc?.kill(), 500);
    }
  }
}

export const auxiliar = new Auxiliar();
