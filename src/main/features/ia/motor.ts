// Motor de IA: escolhe o caminho (1 chamada com áudio, ou 2 chamadas: transcrição + limpeza)
// conforme o provedor, o modelo e o serviço de transcrição escolhidos nas preferências.
import type { FormatoAudio, Preferencias } from "@shared/ipc";
import {
  modeloOuveAudio,
  modeloPadrao,
  modeloTranscricaoPadrao,
  PROVEDORES,
  TRANSCRICOES,
  transcricaoSugerida,
  type IdProvedor,
  type IdTranscricao,
} from "@shared/provedores";
import { lerChave } from "../chaves";
import { lerPreferencias } from "../preferencias";
import { AVISO_TRANSCRICAO_AUTOMATICA, mensagemTranscricao } from "./prompts";
import { chamarAnthropic } from "./provedores/anthropic";
import { chamarChatOpenAI } from "./provedores/chatOpenAI";
import { openRouterOuveAudio } from "./provedores/openrouter";
import { transcrever } from "./provedores/transcricao";
import { parteAudio } from "./audio";
import type { PedidoChat, RespostaChat } from "./types";

/** Uma chamada de chat ao provedor certo (SDK da Anthropic ou formato OpenAI). */
export function chamarChat(pedido: PedidoChat): Promise<RespostaChat> {
  return PROVEDORES[pedido.provedor].formato === "anthropic" ? chamarAnthropic(pedido) : chamarChatOpenAI(pedido);
}

/** O modelo escolhido recebe o áudio direto? O Claude nunca; no OpenRouter vale a lista em cache. */
export function ouveAudioNoMotor(provedor: IdProvedor, modelo: string): boolean {
  if (PROVEDORES[provedor].formato === "anthropic") return false;
  if (provedor === "openrouter") {
    const daLista = openRouterOuveAudio(modelo);
    if (daLista !== null) return daLista;
  }
  return modeloOuveAudio(provedor, modelo);
}

export function modeloDoProvedor(prefs: Preferencias): string {
  return prefs.modelo || prefs.modeloPorProvedor[prefs.provedor] || modeloPadrao(prefs.provedor);
}

/** Serviço de transcrição em uso: o escolhido, ou o do próprio provedor. null = nenhum. */
export function servicoDeTranscricao(prefs: Preferencias): IdTranscricao | null {
  return prefs.transcricao ?? transcricaoSugerida(prefs.provedor);
}

export const erroSemChave = (nome: string): string =>
  `Sem chave ${/^(Lovable|OpenAI|Anthropic|Mistral)/.test(nome) ? "da" : "do"} ${nome}. Coloque em Configurações > IA.`;

export const ERRO_SEM_SERVICO_TRANSCRICAO = "Escolha um serviço de transcrição em Configurações > IA.";

export interface PedidoIa {
  /** Prompt do modo + bloco de contexto. */
  sistema: string;
  /** Mensagem do usuário que acompanha o áudio (caminho de 1 chamada). */
  instrucaoAudio: string;
  /** Mensagem do usuário que leva a transcrição (caminho de 2 chamadas). */
  instrucaoTexto: (transcricao: string) => string;
  wav: Buffer;
  idiomas: string[];
  /** Dicionário da pessoa (vai para o serviço de transcrição). */
  termos: string[];
  /** Teste da chave: força o formato do áudio (1 chamada). */
  formatoForcado?: FormatoAudio;
}

export type ResultadoIa =
  | { ok: true; texto: string; ms: number; semFala: boolean }
  | { ok: false; erro: string; ms: number };

/** Áudio → texto devolvido pelo modelo (ainda sem limpar aspas/cercas). */
export async function executarPedidoIa(p: PedidoIa): Promise<ResultadoIa> {
  const prefs = lerPreferencias();
  const provedor = prefs.provedor;
  const modelo = modeloDoProvedor(prefs);
  const chave = lerChave(provedor);
  if (!chave) return { ok: false, erro: erroSemChave(PROVEDORES[provedor].nome), ms: 0 };

  // 1 chamada: o modelo ouve o áudio e já devolve o texto.
  if (ouveAudioNoMotor(provedor, modelo)) {
    const r = await chamarChat({
      provedor,
      chave,
      modelo,
      mensagens: [
        { role: "system", content: p.sistema },
        {
          role: "user",
          content: [
            { type: "text", text: p.instrucaoAudio },
            parteAudio(p.formatoForcado ?? prefs.formatoAudio ?? "input_audio", p.wav.toString("base64")),
          ],
        },
      ],
    });
    return r.ok ? { ok: true, texto: r.texto, ms: r.ms, semFala: false } : { ok: false, erro: r.erro, ms: r.ms };
  }

  // 2 chamadas: serviço de transcrição, depois o modelo de texto.
  const servico = servicoDeTranscricao(prefs);
  if (!servico) return { ok: false, erro: ERRO_SEM_SERVICO_TRANSCRICAO, ms: 0 };
  const chaveServico = lerChave(TRANSCRICOES[servico].chave);
  if (!chaveServico) return { ok: false, erro: erroSemChave(TRANSCRICOES[servico].nome), ms: 0 };

  const t = await transcrever(servico, p.wav, {
    chave: chaveServico,
    modelo: prefs.modeloPorTranscricao[servico] || modeloTranscricaoPadrao(servico),
    idiomas: p.idiomas,
    termos: p.termos,
  });
  if (!t.ok) return { ok: false, erro: t.erro, ms: t.ms };
  if (!t.texto) return { ok: true, texto: "", ms: t.ms, semFala: true };

  const r = await chamarChat({
    provedor,
    chave,
    modelo,
    mensagens: [
      { role: "system", content: AVISO_TRANSCRICAO_AUTOMATICA + p.sistema },
      { role: "user", content: p.instrucaoTexto(t.texto) },
    ],
  });
  const ms = t.ms + r.ms;
  return r.ok ? { ok: true, texto: r.texto, ms, semFala: false } : { ok: false, erro: r.erro, ms };
}
