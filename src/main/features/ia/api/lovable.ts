// Chamada ao gateway de IA da Lovable (formato OpenAI chat/completions).
// Única porta de saída para a IA: tudo que fala com a Lovable passa por aqui.
import { ENDPOINT_LOVABLE, TIMEOUT_IA_MS } from "@shared/config";
import type { PedidoChat, RespostaChat } from "../types";

/** Traduz o status HTTP do gateway para uma mensagem que o usuário entende. */
function explicarErro(status: number, corpo: string): string {
  // O detalhe do gateway vai junto: foi ele que mostrou a causa da chave suja
  // ("Invalid API key. The key could not be decrypted").
  let detalhe = corpo.trim();
  try {
    const j = JSON.parse(corpo) as { error?: { message?: string } | string; message?: string };
    detalhe = (typeof j.error === "string" ? j.error : j.error?.message) ?? j.message ?? detalhe;
  } catch {}
  detalhe = detalhe.slice(0, 300);
  const motivo =
    status === 401 || status === 403
      ? "Chave recusada pela Lovable."
      : status === 402
        ? "Sem créditos de IA na conta da Lovable."
        : status === 429
          ? "Limite de uso atingido; tente de novo em instantes."
          : status === 404
            ? "Modelo não encontrado no gateway da Lovable."
            : `Erro ${status} do gateway da Lovable.`;
  return detalhe ? `${motivo} (${status}: ${detalhe})` : motivo;
}

export async function chamarLovable(pedido: PedidoChat): Promise<RespostaChat> {
  const inicio = Date.now();
  const ms = () => Date.now() - inicio;
  try {
    const resp = await fetch(ENDPOINT_LOVABLE, {
      method: "POST",
      headers: { Authorization: `Bearer ${pedido.chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: pedido.modelo, messages: pedido.mensagens }),
      signal: AbortSignal.timeout(pedido.timeoutMs ?? TIMEOUT_IA_MS),
    });
    const corpo = await resp.text();
    if (!resp.ok) return { ok: false, status: resp.status, erro: explicarErro(resp.status, corpo), ms: ms() };
    const json = JSON.parse(corpo) as { choices?: { message?: { content?: string | null } }[] };
    const texto = json.choices?.[0]?.message?.content ?? "";
    return { ok: true, texto: texto.trim(), ms: ms() };
  } catch (e) {
    const erro = e as Error;
    const tempoEsgotado = erro.name === "TimeoutError" || erro.name === "AbortError";
    return {
      ok: false,
      status: null,
      erro: tempoEsgotado ? "A IA demorou demais para responder." : `Falha de conexão: ${erro.message}`,
      ms: ms(),
    };
  }
}
