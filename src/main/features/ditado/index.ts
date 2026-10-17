// Ditado (F1): segura Fn → grava → solta → IA transcreve e limpa → cola onde está o cursor.
// Toque rápido em Fn liga o mãos livres (o próximo toque para). Esc cancela.
// Ctrl+Cmd+V cola de novo a última transcrição.
import { clipboard, ipcMain } from "electron";
import {
  ERRO_PILULA_MS,
  GRAVACAO_MAXIMA_S,
  GRAVACAO_MINIMA_MS,
  JANELA_FN_COMBINADO_MS,
  TOQUE_RAPIDO_MS,
} from "@shared/config";
import { CANAIS_PILULA, type AudioPilula } from "@shared/ipc";
import { comandarPilula, idWebContentsPilula, mostrarEstadoPilula } from "../../janelas/pilula";
import { transcreverERefinar } from "../ia/transcrever";
import { auxiliar } from "../nativo";
import type { EventoAuxiliar } from "../nativo/types";
import { garantirMicrofone } from "../permissoes";
import { lerPreferencias } from "../preferencias";

/** Tempo máximo para a pílula devolver o áudio depois do "parar" (ms). */
const TIMEOUT_AUDIO_MS = 8000;

type Estado = "ocioso" | "gravando" | "processando";

let estado: Estado = "ocioso";
let sessao = 0;
let maosLivres = false;
let fnDesceuEm = 0;
let timerMaximo: NodeJS.Timeout | null = null;
let timerErro: NodeJS.Timeout | null = null;
let ultimaTranscricao = "";
const esperandoAudio = new Map<number, (a: AudioPilula) => void>();

const sons = () => lerPreferencias().sons;

function limparTimers(): void {
  if (timerMaximo) clearTimeout(timerMaximo);
  timerMaximo = null;
}

function ocultar(): void {
  if (timerErro) clearTimeout(timerErro);
  timerErro = null;
  mostrarEstadoPilula({ estado: "oculta" });
}

function mostrarErro(mensagem: string): void {
  estado = "ocioso";
  limparTimers();
  if (timerErro) clearTimeout(timerErro);
  mostrarEstadoPilula({ estado: "erro", mensagem });
  timerErro = setTimeout(ocultar, ERRO_PILULA_MS);
}

async function iniciar(): Promise<void> {
  estado = "gravando";
  maosLivres = false;
  const minhaSessao = ++sessao;
  if (timerErro) clearTimeout(timerErro);
  mostrarEstadoPilula({ estado: "gravando", modo: "ditado", maosLivres: false });

  if (!(await garantirMicrofone())) {
    mostrarErro("Sem permissão de microfone. Veja as Configurações.");
    return;
  }
  if (sessao !== minhaSessao || estado !== "gravando") return; // cancelado enquanto pedia permissão
  comandarPilula({ acao: "iniciar", sessao: minhaSessao, sons: sons(), microfoneId: lerPreferencias().microfoneId });
  timerMaximo = setTimeout(() => void parar(), GRAVACAO_MAXIMA_S * 1000);
}

function cancelar(): void {
  if (estado === "gravando") {
    comandarPilula({ acao: "cancelar", sessao, sons: sons() });
  } else if (estado === "processando") {
    // A resposta da IA ainda vai chegar, mas com outra sessão ela é ignorada (ver parar()).
    sessao++;
  } else {
    return;
  }
  estado = "ocioso";
  limparTimers();
  ocultar();
}

function esperarAudio(s: number): Promise<AudioPilula> {
  return new Promise((resolver) => {
    const timer = setTimeout(() => {
      esperandoAudio.delete(s);
      resolver({ sessao: s, ok: false, erro: "A gravação não terminou a tempo." });
    }, TIMEOUT_AUDIO_MS);
    esperandoAudio.set(s, (a) => {
      clearTimeout(timer);
      resolver(a);
    });
  });
}

async function parar(): Promise<void> {
  if (estado !== "gravando") return;
  estado = "processando";
  limparTimers();
  const minhaSessao = sessao;
  mostrarEstadoPilula({ estado: "processando", modo: "ditado" });
  const promessa = esperarAudio(minhaSessao);
  comandarPilula({ acao: "parar", sessao: minhaSessao, sons: sons() });
  const audio = await promessa;
  if (sessao !== minhaSessao) return; // cancelado enquanto a pílula convertia

  if (!audio.ok) return mostrarErro(audio.erro);
  if (audio.duracaoMs < GRAVACAO_MINIMA_MS) {
    estado = "ocioso";
    return ocultar();
  }

  const r = await transcreverERefinar(Buffer.from(audio.wav));
  if (sessao !== minhaSessao) return; // outra sessão começou nesse meio-tempo
  if (!r.ok) return mostrarErro(r.erro);
  if (!r.texto) return mostrarErro("Não entendi nenhuma fala.");

  ultimaTranscricao = r.texto;
  const colou = await auxiliar.enviar({ cmd: "colar", texto: r.texto });
  if (!colou.ok) {
    // Não deu para colar sozinho: deixa na área de transferência para o usuário colar.
    clipboard.writeText(r.texto);
    return mostrarErro(`${colou.erro ?? "Não consegui colar."} O texto foi copiado: cole com Cmd+V.`);
  }
  estado = "ocioso";
  ocultar();
}

function aoEvento(ev: EventoAuxiliar): void {
  const agora = Date.now();
  switch (ev.evento) {
    case "fn":
      if (ev.estado === "desce") {
        fnDesceuEm = agora;
        if (estado === "ocioso") void iniciar();
        else if (estado === "gravando" && maosLivres) void parar();
      } else if (estado === "gravando" && !maosLivres) {
        if (agora - fnDesceuEm < TOQUE_RAPIDO_MS) {
          maosLivres = true;
          mostrarEstadoPilula({ estado: "gravando", modo: "ditado", maosLivres: true });
        } else {
          void parar();
        }
      }
      break;
    case "fn_combinado":
      // Fn usada como modificador (Fn+Delete, Fn+F5…): não era ditado.
      if (estado === "gravando" && !maosLivres && agora - fnDesceuEm < JANELA_FN_COMBINADO_MS) cancelar();
      break;
    case "esc":
      cancelar();
      break;
    case "colar_ultima":
      if (ultimaTranscricao && estado === "ocioso") void auxiliar.enviar({ cmd: "colar", texto: ultimaTranscricao });
      break;
  }
}

export function iniciarDitado(): void {
  auxiliar.on("evento", aoEvento);
  ipcMain.on(CANAIS_PILULA.AUDIO, (e, a: AudioPilula) => {
    if (e.sender.id !== idWebContentsPilula()) return;
    esperandoAudio.get(a.sessao)?.(a);
    esperandoAudio.delete(a.sessao);
  });
  ipcMain.on(CANAIS_PILULA.ACAO, (e, acao: "confirmar" | "cancelar") => {
    if (e.sender.id !== idWebContentsPilula()) return;
    if (acao === "confirmar") void parar();
    else cancelar();
  });
}
