// Ditado: segura o atalho → grava → solta → IA → cola onde está o cursor.
// Modos (atalhos configuráveis; padrão do Mac):
//  - ditado (Fn): transcreve e limpa;
//  - pergunte (Fn+Espaço): com texto selecionado, aplica a instrução falada e substitui a seleção;
//    sem seleção, responde num cartão;
//  - tradução (Fn+⇧ esq.): fala em qualquer idioma, sai no idioma escolhido.
// Segurando Fn e apertando Espaço/⇧ no meio, o modo muda. Toque rápido = mãos livres (o próximo
// toque para). Esc ou ✕ cancelam; ✓ termina. "Colar a última" cola de novo a última transcrição.
import { clipboard, ipcMain } from "electron";
import {
  ERRO_PILULA_MS,
  GRAVACAO_MAXIMA_S,
  GRAVACAO_MINIMA_MS,
  JANELA_FN_COMBINADO_MS,
  TOQUE_RAPIDO_MS,
} from "@shared/config";
import type { IdAtalho } from "@shared/atalhos";
import { CANAIS_PILULA, type AudioPilula, type ModoDitado } from "@shared/ipc";
import { mostrarCartao } from "../../janelas/cartao";
import { comandarPilula, idWebContentsPilula, mostrarEstadoPilula } from "../../janelas/pilula";
import { observarEdicao, palavrasParaPrompt } from "../dicionario";
import { registrarDitado, type NovoDitado } from "../historico";
import { executarModo } from "../ia/modos";
import type { DadosContexto } from "../ia/prompts";
import { auxiliar } from "../nativo";
import type { ContextoApp, EventoAuxiliar } from "../nativo/types";
import { garantirMicrofone } from "../permissoes";
import { lerPreferencias } from "../preferencias";
import { ajustarEspacoInicial, limparInicio } from "./lib/espacamento";

/** Tempo máximo para a pílula devolver o áudio depois do "parar" (ms). */
const TIMEOUT_AUDIO_MS = 8000;
/** Espera para silenciar o som de fundo depois do bipe de início (ms), senão o bipe some. */
const ATRASO_SILENCIAR_MS = 250;
/** Quanto tempo o aviso "Adicionado ao dicionário" fica na pílula (ms). */
const AVISO_MS = 2500;

const MODO_DO_ATALHO: Partial<Record<IdAtalho, ModoDitado>> = {
  ditado: "ditado",
  pergunte: "pergunte",
  traducao: "traducao",
};

type Estado = "ocioso" | "gravando" | "processando";

let estado: Estado = "ocioso";
let modo: ModoDitado = "ditado";
let sessao = 0;
let maosLivres = false;
let primeiroDesceuEm = 0;
/** Atalhos de ditado seguros agora (para saber quando o último foi solto). */
let seguros = new Set<IdAtalho>();
let contextoSessao: Promise<ContextoApp | null> = Promise.resolve(null);
let silenciou = false;
let timerMaximo: NodeJS.Timeout | null = null;
let timerPilula: NodeJS.Timeout | null = null;
let ultimaTranscricao = "";
const esperandoAudio = new Map<number, (a: AudioPilula) => void>();

const sons = () => lerPreferencias().sons;

/**
 * Modo de teste (só com FALAAI_TESTE=1 no ambiente): os atalhos podem ser simulados pelo inspetor,
 * o texto NÃO é colado (fica em ultimaColagemTeste) e o contexto da tela não é lido nem observado.
 * Serve para testar o fluxo inteiro sem tocar nos apps do usuário.
 */
const MODO_TESTE = process.env.FALAAI_TESTE === "1";
let ultimaColagemTeste: string | null = null;

// ── Pílula ──────────────────────────────────────────────────────────────────

function ocultar(): void {
  if (timerPilula) clearTimeout(timerPilula);
  timerPilula = null;
  mostrarEstadoPilula({ estado: "oculta" });
}

function mostrarTemporario(tipo: "erro" | "aviso", mensagem: string, ms: number): void {
  if (timerPilula) clearTimeout(timerPilula);
  mostrarEstadoPilula({ estado: tipo, mensagem });
  timerPilula = setTimeout(() => estado === "ocioso" && ocultar(), ms);
}

function limparTimerMaximo(): void {
  if (timerMaximo) clearTimeout(timerMaximo);
  timerMaximo = null;
}

function terminarComErro(mensagem: string): void {
  estado = "ocioso";
  limparTimerMaximo();
  void dessilenciar();
  mostrarTemporario("erro", mensagem, ERRO_PILULA_MS);
}

// ── Som de fundo ────────────────────────────────────────────────────────────

async function silenciar(minhaSessao: number): Promise<void> {
  if (!lerPreferencias().silenciarFundo) return;
  await new Promise((r) => setTimeout(r, ATRASO_SILENCIAR_MS));
  if (sessao !== minhaSessao || estado !== "gravando") return;
  const r = await auxiliar.enviar({ cmd: "mutar_saida" });
  silenciou = r.ok;
}

async function dessilenciar(): Promise<void> {
  if (!silenciou) return;
  silenciou = false;
  await auxiliar.enviar({ cmd: "desmutar_saida" });
}

// ── Gravação ────────────────────────────────────────────────────────────────

async function iniciar(novoModo: ModoDitado, atalho: IdAtalho): Promise<void> {
  estado = "gravando";
  modo = novoModo;
  maosLivres = false;
  seguros = new Set([atalho]);
  const minhaSessao = ++sessao;
  if (timerPilula) clearTimeout(timerPilula);
  mostrarEstadoPilula({ estado: "gravando", modo, maosLivres: false });

  // Contexto lido já no início: o campo e a seleção ainda são os do usuário.
  contextoSessao = MODO_TESTE
    ? Promise.resolve(null)
    : auxiliar
    .enviar({ cmd: "contexto" })
    .then((r) => (r.ok ? (r as unknown as ContextoApp) : null))
    .catch(() => null);

  if (!(await garantirMicrofone())) return terminarComErro("Sem permissão de microfone. Veja as Configurações.");
  if (sessao !== minhaSessao || estado !== "gravando") return; // cancelado enquanto pedia permissão
  comandarPilula({ acao: "iniciar", sessao: minhaSessao, sons: sons(), microfoneId: lerPreferencias().microfoneId });
  void silenciar(minhaSessao);
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
  limparTimerMaximo();
  void dessilenciar();
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

function dadosDoContexto(ctx: ContextoApp | null): DadosContexto {
  const prefs = lerPreferencias();
  const c = prefs.usarContexto ? ctx : null;
  return {
    app: c?.app?.nome ?? null,
    janela: c?.app?.janela ?? null,
    url: c?.navegador?.url ?? null,
    placeholder: c?.campo?.placeholder ?? null,
    antes: c?.campo?.antes ?? "",
    depois: c?.campo?.depois ?? "",
    idiomas: prefs.idiomas,
    dicionario: palavrasParaPrompt(),
  };
}

async function parar(): Promise<void> {
  if (estado !== "gravando") return;
  estado = "processando";
  limparTimerMaximo();
  const minhaSessao = sessao;
  const meuModo = modo;
  await dessilenciar(); // antes do bipe de fim
  mostrarEstadoPilula({ estado: "processando", modo: meuModo });
  const promessa = esperarAudio(minhaSessao);
  comandarPilula({ acao: "parar", sessao: minhaSessao, sons: sons() });
  const audio = await promessa;
  if (sessao !== minhaSessao) return; // cancelado enquanto a pílula convertia

  if (!audio.ok) return terminarComErro(audio.erro);
  if (audio.duracaoMs < GRAVACAO_MINIMA_MS) {
    estado = "ocioso";
    return ocultar();
  }

  const ctx = await contextoSessao;
  const selecionado = ctx?.campo?.selecionado ?? "";
  const wav = Buffer.from(audio.wav);
  const base: Omit<NovoDitado, "texto" | "status" | "erro"> = {
    modo: meuModo,
    textoSelecionado: meuModo === "pergunte" && selecionado ? selecionado : null,
    duracaoMs: audio.duracaoMs,
    app: ctx?.app?.nome ?? null,
    appId: ctx?.app?.appId ?? null,
    url: ctx?.navegador?.url ?? null,
    wav,
  };

  const r = await executarModo({ wav, modo: meuModo, contexto: dadosDoContexto(ctx), selecionado });
  if (sessao !== minhaSessao) return; // cancelado (✕/Esc) enquanto a IA respondia
  if (!r.ok) {
    registrarDitado({ ...base, texto: "", status: "erro", erro: r.erro });
    return terminarComErro(r.erro);
  }

  if (r.acao === "cartao") {
    registrarDitado({ ...base, texto: r.resposta, status: "ok", erro: null });
    mostrarCartao({ pergunta: r.pergunta, resposta: r.resposta });
    estado = "ocioso";
    return ocultar();
  }

  if (!r.texto) return terminarComErro("Não entendi nenhuma fala.");
  const antes = ctx?.campo?.antes ?? "";
  const texto = meuModo === "pergunte" ? r.texto : limparInicio(antes, r.texto);
  // Substituindo uma seleção, o texto entra no lugar dela: não mexe no espaço.
  const final = meuModo === "pergunte" ? texto : ajustarEspacoInicial(antes, texto);
  ultimaTranscricao = texto;
  registrarDitado({ ...base, texto, status: "ok", erro: null });

  const colou = MODO_TESTE
    ? ((ultimaColagemTeste = final), { ok: true, erro: undefined })
    : await auxiliar.enviar({ cmd: "colar", texto: final });
  if (!colou.ok) {
    // Não deu para colar sozinho: deixa na área de transferência para o usuário colar.
    clipboard.writeText(texto);
    return terminarComErro(`${colou.erro ?? "Não consegui colar."} O texto foi copiado: cole com Cmd+V.`);
  }
  estado = "ocioso";
  ocultar();

  if (meuModo === "ditado" && !MODO_TESTE) {
    observarEdicao(final.trim(), base.appId, (termos) => {
      if (estado === "ocioso") mostrarTemporario("aviso", `Adicionado ao dicionário: ${termos.join(", ")}`, AVISO_MS);
    });
  }
}

// ── Eventos do teclado ──────────────────────────────────────────────────────

function aoAtalho(id: IdAtalho, desceu: boolean): void {
  const agora = Date.now();
  if (id === "colarUltima") {
    if (desceu && estado === "ocioso" && ultimaTranscricao) void auxiliar.enviar({ cmd: "colar", texto: ultimaTranscricao });
    return;
  }
  const modoDoAtalho = MODO_DO_ATALHO[id];
  if (!modoDoAtalho) return;

  if (desceu) {
    seguros.add(id);
    if (estado === "ocioso") {
      primeiroDesceuEm = agora;
      void iniciar(modoDoAtalho, id);
    } else if (estado === "gravando") {
      if (maosLivres) void parar();
      else if (modoDoAtalho !== modo) {
        // Ex.: segurando Fn (ditado) e apertou Espaço → vira "pergunte".
        modo = modoDoAtalho;
        mostrarEstadoPilula({ estado: "gravando", modo, maosLivres });
      }
    }
    return;
  }

  seguros.delete(id);
  if (estado !== "gravando" || maosLivres || seguros.size > 0) return;
  if (agora - primeiroDesceuEm < TOQUE_RAPIDO_MS) {
    maosLivres = true;
    mostrarEstadoPilula({ estado: "gravando", modo, maosLivres: true });
  } else {
    void parar();
  }
}

function aoEvento(ev: EventoAuxiliar): void {
  switch (ev.evento) {
    case "atalho":
      aoAtalho(ev.id, ev.estado === "desce");
      break;
    case "combinado":
      // Fn usada como modificador (Fn+Delete, Fn+F5…): não era ditado.
      if (estado === "gravando" && !maosLivres && Date.now() - primeiroDesceuEm < JANELA_FN_COMBINADO_MS) cancelar();
      break;
    case "esc":
      cancelar();
      break;
  }
}

export function iniciarDitado(): void {
  auxiliar.on("evento", aoEvento);
  if (MODO_TESTE) {
    (globalThis as Record<string, unknown>).__falaaiTeste = {
      evento: aoEvento,
      ultimaColagem: () => ultimaColagemTeste,
      estado: () => ({ estado, modo, maosLivres }),
    };
  }
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
