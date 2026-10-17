// Transcrição (fala → texto bruto) pelos serviços OpenAI, Groq, ElevenLabs, Deepgram e Mistral.
import { TIMEOUT_IA_MS } from "@shared/config";
import { TRANSCRICOES, type IdTranscricao } from "@shared/provedores";
import { explicarErro, explicarFalhaDeRede } from "./erros";
import { lerTextoTranscricao, montarPedidoTranscricao } from "./montagemTranscricao";

export interface OpcoesTranscricao {
  chave: string;
  modelo: string;
  idiomas: string[];
  termos: string[];
  timeoutMs?: number;
}

export type ResultadoTranscricaoBruta =
  | { ok: true; texto: string; ms: number }
  | { ok: false; erro: string; ms: number };

export async function transcrever(servico: IdTranscricao, wav: Buffer, opcoes: OpcoesTranscricao): Promise<ResultadoTranscricaoBruta> {
  const inicio = Date.now();
  const ms = () => Date.now() - inicio;
  const nome = TRANSCRICOES[servico].nome;
  const limite = opcoes.timeoutMs ?? TIMEOUT_IA_MS;

  const enviar = async (termos: string[]) => {
    const pedido = montarPedidoTranscricao(servico, wav, { ...opcoes, termos });
    const resp = await fetch(pedido.url, {
      method: "POST",
      headers: pedido.headers,
      body: pedido.corpo as RequestInit["body"],
      signal: AbortSignal.timeout(limite),
    });
    return { resp, corpo: await resp.text() };
  };

  try {
    let { resp, corpo } = await enviar(opcoes.termos);
    // Campo de dicionário que o serviço não aceitou (400/422): tenta de novo sem os termos,
    // para o dicionário nunca impedir o ditado.
    if ((resp.status === 400 || resp.status === 422) && opcoes.termos.length) {
      const segunda = await enviar([]);
      if (segunda.resp.ok) ({ resp, corpo } = segunda);
    }
    if (!resp.ok) return { ok: false, erro: explicarErro(nome, resp.status, corpo), ms: ms() };
    return { ok: true, texto: lerTextoTranscricao(servico, JSON.parse(corpo)), ms: ms() };
  } catch (e) {
    return { ok: false, erro: explicarFalhaDeRede(e), ms: ms() };
  }
}
