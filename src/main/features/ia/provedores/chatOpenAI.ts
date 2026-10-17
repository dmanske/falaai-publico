// Cliente de chat compatível com a OpenAI: POST {baseUrl}/chat/completions com Bearer.
// Atende Lovable, Gemini (endpoint /v1beta/openai), OpenRouter, OpenAI, Groq, Mistral e DeepSeek.
import { TIMEOUT_IA_MS } from "@shared/config";
import { PROVEDORES } from "@shared/provedores";
import type { PedidoChat, RespostaChat } from "../types";
import { explicarErro, explicarFalhaDeRede } from "./erros";
import { cabecalhosChat, textoDaRespostaChat, urlChat } from "./montagemChat";

export async function chamarChatOpenAI(pedido: PedidoChat): Promise<RespostaChat> {
  const inicio = Date.now();
  const ms = () => Date.now() - inicio;
  try {
    const resp = await fetch(urlChat(pedido.provedor), {
      method: "POST",
      headers: cabecalhosChat(pedido.provedor, pedido.chave),
      body: JSON.stringify({ model: pedido.modelo, messages: pedido.mensagens }),
      signal: AbortSignal.timeout(pedido.timeoutMs ?? TIMEOUT_IA_MS),
    });
    const corpo = await resp.text();
    if (!resp.ok) {
      return { ok: false, status: resp.status, erro: explicarErro(PROVEDORES[pedido.provedor].nome, resp.status, corpo), ms: ms() };
    }
    return { ok: true, texto: textoDaRespostaChat(JSON.parse(corpo)), ms: ms() };
  } catch (e) {
    return { ok: false, status: null, erro: explicarFalhaDeRede(e), ms: ms() };
  }
}
