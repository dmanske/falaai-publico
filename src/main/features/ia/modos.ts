// Ditado e tradução recebem também o "Ritmo da fala" medido no áudio (ritmo/).
// Executa um modo do ditado (1 chamada com áudio, ou transcrição + limpeza; ver motor.ts):
//  - ditado: transcreve e limpa (PROMPT_DITADO + contexto);
//  - traducao: transcreve e traduz para o idioma escolhido;
//  - pergunte com seleção: aplica a instrução falada ao texto selecionado;
//  - pergunte sem seleção: responde a pergunta (vai para o cartão).
import type { ModoDitado } from "@shared/ipc";
import { lerPreferencias } from "../preferencias";
import { executarPedidoIa } from "./motor";
import {
  blocoContexto,
  MARCA_SEM_FALA,
  PROMPT_COMANDO_SELECAO,
  PROMPT_DITADO,
  mensagemTranscricao,
  PROMPT_PERGUNTA,
  promptTraducao,
  type DadosContexto,
} from "./prompts";
import { limparResposta } from "./audio";
import { blocoRitmo } from "./ritmo/bloco";
import { analisarRitmo, poucaFala } from "./ritmo";

export interface PedidoModo {
  wav: Buffer;
  modo: ModoDitado;
  contexto: DadosContexto;
  /** Texto selecionado no app (modo pergunte). Vazio = sem seleção. */
  selecionado: string;
  /** Modo tradução: idioma de destino escolhido na hora (se omitido, o das preferências). */
  idiomaDestino?: string;
  /** Prazo de cada chamada à IA (ms); o ditado passa prazoIaMs(duração). */
  timeoutMs?: number;
}

export type ResultadoModo =
  | { ok: true; acao: "colar"; texto: string; ms: number }
  | { ok: true; acao: "cartao"; pergunta: string; resposta: string; ms: number }
  | { ok: false; erro: string; ms: number };

/** A resposta do modo pergunte vem como JSON; se a IA fugir do formato, usa o texto inteiro. */
export function lerRespostaPergunta(bruto: string): { pergunta: string; resposta: string } {
  const t = bruto.trim().replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "");
  try {
    const j = JSON.parse(t) as { pergunta?: unknown; resposta?: unknown };
    if (typeof j.resposta === "string") return { pergunta: String(j.pergunta ?? ""), resposta: j.resposta.trim() };
  } catch {
    // segue para o texto puro
  }
  return { pergunta: "", resposta: t };
}

export async function executarModo(p: PedidoModo): Promise<ResultadoModo> {
  const prefs = lerPreferencias();
  // Quase sem fala medida no áudio: nem chama a IA, que inventava um texto a partir da tela (20/10/2026).
  const ritmo = analisarRitmo(p.wav);
  if (poucaFala(ritmo)) return { ok: true, acao: "colar", texto: "", ms: 0 };

  const comSelecao = p.modo === "pergunte" && p.selecionado.trim() !== "";
  let sistema: string;
  let instrucaoAudio: string;
  let instrucaoTexto: (transcricao: string) => string = mensagemTranscricao;
  if (p.modo === "traducao") {
    sistema = promptTraducao(p.idiomaDestino ?? prefs.idiomaTraducao) + blocoContexto({ ...p.contexto, antes: "", depois: "" }) + blocoRitmo(ritmo);
    instrucaoAudio = "Traduza este áudio.";
  } else if (comSelecao) {
    sistema = PROMPT_COMANDO_SELECAO + blocoContexto({ ...p.contexto, antes: "", depois: "" });
    instrucaoAudio = `TEXTO SELECIONADO:\n«${p.selecionado}»\n\nA instrução está no áudio.`;
    instrucaoTexto = (t) => `TEXTO SELECIONADO:\n«${p.selecionado}»\n\nA instrução está na transcrição abaixo.\n\n${mensagemTranscricao(t)}`;
  } else if (p.modo === "pergunte") {
    sistema = PROMPT_PERGUNTA + blocoContexto({ ...p.contexto, antes: "", depois: "", dicionario: p.contexto.dicionario });
    instrucaoAudio = "Responda à pergunta deste áudio.";
  } else {
    // O ritmo (pausas) é medido aqui no computador e vai como dica, nos dois caminhos (1 ou 2 chamadas).
    sistema = PROMPT_DITADO + blocoContexto(p.contexto) + blocoRitmo(ritmo);
    instrucaoAudio = "Transcreva e limpe este ditado.";
  }

  const r = await executarPedidoIa({
    sistema,
    instrucaoAudio,
    instrucaoTexto,
    wav: p.wav,
    idiomas: p.contexto.idiomas,
    termos: p.contexto.dicionario,
    timeoutMs: p.timeoutMs,
  });
  if (!r.ok) return { ok: false, erro: r.erro, ms: r.ms };
  // Transcrição vazia ou "<vazio>": o ditado mostra "Não entendi nenhuma fala".
  if (r.semFala || r.texto.trim() === MARCA_SEM_FALA) return { ok: true, acao: "colar", texto: "", ms: r.ms };

  if (p.modo === "pergunte" && !comSelecao) {
    const { pergunta, resposta } = lerRespostaPergunta(r.texto);
    return { ok: true, acao: "cartao", pergunta, resposta, ms: r.ms };
  }
  return { ok: true, acao: "colar", texto: limparResposta(r.texto), ms: r.ms };
}
