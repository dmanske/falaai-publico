// Cliente da Anthropic (Claude) pelo SDK oficial. O Claude NÃO recebe áudio: só limpa texto
// (a transcrição vem de um serviço à parte). Pedido sem `thinking`, `temperature` e `top_p`:
// os modelos 5.5 respondem 400 se esses campos vierem (thinking desativado inclusive).
import Anthropic from "@anthropic-ai/sdk";
import { TIMEOUT_IA_MS } from "@shared/config";
import type { MensagemChat, PedidoChat, RespostaChat } from "../types";
import { BETA_FALLBACK, explicarErroAnthropic, juntarBlocosDeTexto, modeloTemFallback } from "./anthropicApoio";

/** Teto de saída. Ditado é curto; o valor alto só evita corte em textos longos. */
const MAX_TOKENS = 16_000;
/** Ditado precisa de velocidade: esforço mínimo de raciocínio. */
const ESFORCO = "low" as const;

/** Separa o sistema (vai no campo `system`) do texto do usuário. O Claude só recebe texto aqui. */
function separarMensagens(mensagens: MensagemChat[]): { sistema: string | undefined; usuario: string } {
  const sistema = mensagens
    .filter((m) => m.role === "system")
    .map((m) => (typeof m.content === "string" ? m.content : ""))
    .join("\n\n");
  const usuario = mensagens
    .filter((m) => m.role === "user")
    .map((m) => (typeof m.content === "string" ? m.content : m.content.map((p) => (p.type === "text" ? p.text : "")).join("\n")))
    .join("\n\n");
  return { sistema: sistema || undefined, usuario };
}

export async function chamarAnthropic(pedido: PedidoChat): Promise<RespostaChat> {
  const inicio = Date.now();
  const ms = () => Date.now() - inicio;
  try {
    const { sistema, usuario } = separarMensagens(pedido.mensagens);
    const client = new Anthropic({ apiKey: pedido.chave, maxRetries: 1, timeout: pedido.timeoutMs ?? TIMEOUT_IA_MS });
    const base = {
      model: pedido.modelo,
      max_tokens: MAX_TOKENS,
      ...(sistema ? { system: sistema } : {}),
      messages: [{ role: "user" as const, content: usuario }],
      output_config: { effort: ESFORCO },
    };
    const resposta = modeloTemFallback(pedido.modelo)
      ? await client.beta.messages.create({ ...base, betas: [BETA_FALLBACK], fallbacks: "default" })
      : await client.messages.create(base);
    if (resposta.stop_reason === "refusal") {
      return { ok: false, status: null, erro: "O Claude recusou este texto.", ms: ms() };
    }
    return { ok: true, texto: juntarBlocosDeTexto(resposta.content), ms: ms() };
  } catch (e) {
    return { ok: false, status: e instanceof Anthropic.APIError ? (e.status ?? null) : null, erro: explicarErroAnthropic(e), ms: ms() };
  }
}
