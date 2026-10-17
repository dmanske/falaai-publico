// Peças do cliente da Anthropic que não dependem de rede nem de Electron: tradução dos erros do
// SDK, leitura dos blocos de resposta e regra do fallback. Testadas em anthropic.test.ts.
import Anthropic from "@anthropic-ai/sdk";
import { PROVEDORES } from "../../../../shared/provedores.ts";
import { explicarFalhaDeRede } from "./erros.ts";

const NOME = PROVEDORES.anthropic.nome;

/** Cabeçalho beta do fallback no servidor (se o modelo recusar, a Anthropic tenta outro sozinha). */
export const BETA_FALLBACK = "server-side-fallback-2026-07-01";
/** Modelos com fallback no servidor. O Haiku 5.5 não tem; mandar `fallbacks` nele dá 400. */
const MODELOS_COM_FALLBACK = new Set(["claude-opus-5-5", "claude-sonnet-5-5"]);

export const modeloTemFallback = (modelo: string): boolean => MODELOS_COM_FALLBACK.has(modelo);

/** Detalhe que a API devolveu ({type:"error", error:{type, message}}). */
function detalheDoErro(e: InstanceType<typeof Anthropic.APIError>): string {
  const interno = (e.error as { error?: { message?: unknown }; message?: unknown } | undefined) ?? {};
  const m = interno.error?.message ?? interno.message;
  return (typeof m === "string" ? m : "").replace(/\s+/g, " ").slice(0, 300);
}

/**
 * Traduz um erro do SDK para português, pelas classes tipadas (não pelo texto do erro).
 * Única exceção: a falta de saldo chega como BadRequestError genérico, sem classe própria;
 * ali o texto do detalhe decide.
 */
export function explicarErroAnthropic(e: unknown): string {
  const A = Anthropic;
  if (e instanceof A.APIUserAbortError) return "A chamada à IA foi cancelada.";
  if (e instanceof A.APIConnectionTimeoutError) return "A IA demorou demais para responder.";
  if (e instanceof A.APIConnectionError) return explicarFalhaDeRede(e);
  if (e instanceof A.APIError) {
    const detalhe = detalheDoErro(e);
    const com = (motivo: string) => (detalhe ? `${motivo} (${e.status}: ${detalhe})` : `${motivo} (${e.status})`);
    if (e instanceof A.AuthenticationError || e instanceof A.PermissionDeniedError) {
      return com(`Chave recusada pela ${NOME}.`);
    }
    if (e instanceof A.NotFoundError) return com(`Modelo não encontrado na ${NOME}.`);
    if (e instanceof A.RateLimitError) return com("Limite de uso atingido; tente de novo em instantes.");
    if (e instanceof A.BadRequestError && /credit balance|billing/i.test(detalhe)) {
      return com(`Sem créditos na conta da ${NOME}.`);
    }
    if (e.status === 529) return com(`A ${NOME} está sobrecarregada; tente de novo em instantes.`);
    return com(e.status ? `Erro ${e.status} da ${NOME}.` : `Erro da ${NOME}.`);
  }
  return explicarFalhaDeRede(e);
}

/** Junta os blocos de texto da resposta; ignora `thinking` e qualquer outro tipo. */
export function juntarBlocosDeTexto(content: { type: string; text?: string }[]): string {
  return content
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("")
    .trim();
}

