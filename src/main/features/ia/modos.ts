// Executa um modo do ditado com uma chamada à IA:
//  - ditado: transcreve e limpa (PROMPT_DITADO + contexto);
//  - traducao: transcreve e traduz para o idioma escolhido;
//  - pergunte com seleção: aplica a instrução falada ao texto selecionado;
//  - pergunte sem seleção: responde a pergunta (vai para o cartão).
import type { ModoDitado } from "@shared/ipc";
import { lerChave } from "../chaves";
import { lerPreferencias } from "../preferencias";
import { chamarLovable } from "./api/lovable";
import {
  blocoContexto,
  MARCA_SEM_FALA,
  PROMPT_COMANDO_SELECAO,
  PROMPT_DITADO,
  PROMPT_PERGUNTA,
  promptTraducao,
  type DadosContexto,
} from "./prompts";
import { limparResposta, parteAudio } from "./transcrever";

export interface PedidoModo {
  wav: Buffer;
  modo: ModoDitado;
  contexto: DadosContexto;
  /** Texto selecionado no app (modo pergunte). Vazio = sem seleção. */
  selecionado: string;
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
  const chave = lerChave("lovable");
  if (!chave) return { ok: false, erro: "Sem chave da Lovable. Abra as Configurações.", ms: 0 };
  const prefs = lerPreferencias();

  const comSelecao = p.modo === "pergunte" && p.selecionado.trim() !== "";
  let sistema: string;
  let instrucao: string;
  if (p.modo === "traducao") {
    sistema = promptTraducao(prefs.idiomaTraducao) + blocoContexto({ ...p.contexto, antes: "", depois: "" });
    instrucao = "Traduza este áudio.";
  } else if (comSelecao) {
    sistema = PROMPT_COMANDO_SELECAO + blocoContexto({ ...p.contexto, antes: "", depois: "" });
    instrucao = `TEXTO SELECIONADO:\n«${p.selecionado}»\n\nA instrução está no áudio.`;
  } else if (p.modo === "pergunte") {
    sistema = PROMPT_PERGUNTA + blocoContexto({ ...p.contexto, antes: "", depois: "", dicionario: p.contexto.dicionario });
    instrucao = "Responda à pergunta deste áudio.";
  } else {
    sistema = PROMPT_DITADO + blocoContexto(p.contexto);
    instrucao = "Transcreva e limpe este ditado.";
  }

  const r = await chamarLovable({
    chave,
    modelo: prefs.modelo,
    mensagens: [
      { role: "system", content: sistema },
      {
        role: "user",
        content: [
          { type: "text", text: instrucao },
          parteAudio(prefs.formatoAudio ?? "input_audio", p.wav.toString("base64")),
        ],
      },
    ],
  });
  if (!r.ok) return { ok: false, erro: r.erro, ms: r.ms };
  if (r.texto.trim() === MARCA_SEM_FALA) return { ok: true, acao: "colar", texto: "", ms: r.ms };

  if (p.modo === "pergunte" && !comSelecao) {
    const { pergunta, resposta } = lerRespostaPergunta(r.texto);
    return { ok: true, acao: "cartao", pergunta, resposta, ms: r.ms };
  }
  return { ok: true, acao: "colar", texto: limparResposta(r.texto), ms: r.ms };
}
