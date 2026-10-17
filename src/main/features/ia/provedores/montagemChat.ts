// Peças puras do chat compatível com a OpenAI (sem rede): cabeçalhos e leitura da resposta.
import { PROVEDORES, type IdProvedor } from "../../../../shared/provedores.ts";

/** Identificação opcional no OpenRouter (aparece no ranking dele; não é necessária para funcionar). */
export const REFERER_OPENROUTER = "https://github.com/dmanske/falaai-publico";
export const TITULO_OPENROUTER = "FalaAi";

export function urlChat(provedor: IdProvedor): string {
  return `${PROVEDORES[provedor].baseUrl.replace(/\/+$/, "")}/chat/completions`;
}

export function cabecalhosChat(provedor: IdProvedor, chave: string): Record<string, string> {
  const h: Record<string, string> = { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" };
  if (provedor === "openrouter") {
    h["HTTP-Referer"] = REFERER_OPENROUTER;
    h["X-Title"] = TITULO_OPENROUTER;
  }
  return h;
}

/**
 * Texto da resposta: `choices[0].message.content`. Alguns provedores devolvem uma lista de
 * partes ({type:"text",text}); modelos de áudio da OpenAI podem trazer só `audio.transcript`.
 */
export function textoDaRespostaChat(json: unknown): string {
  const msg = (json as { choices?: { message?: { content?: unknown; audio?: { transcript?: unknown } } }[] } | null)
    ?.choices?.[0]?.message;
  const c = msg?.content;
  if (typeof c === "string" && c.trim()) return c.trim();
  if (Array.isArray(c)) {
    const t = c
      .map((p) => (p && typeof p === "object" && typeof (p as { text?: unknown }).text === "string" ? (p as { text: string }).text : ""))
      .join("")
      .trim();
    if (t) return t;
  }
  const transcricao = msg?.audio?.transcript;
  return typeof transcricao === "string" ? transcricao.trim() : "";
}
