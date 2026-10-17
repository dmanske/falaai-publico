// Converte a lista pública do OpenRouter (GET /api/v1/models) para o formato da tela.
// Função pura (sem rede): testada em openrouterConversao.test.ts.
import type { ModeloOpenRouter } from "../../../../shared/ipc/ia.ts";

/** Item da API, só com os campos que usamos. */
export interface ModeloBrutoOpenRouter {
  id?: string;
  name?: string;
  context_length?: number | null;
  architecture?: { input_modalities?: string[] | null } | null;
  pricing?: { prompt?: string | null; completion?: string | null; audio?: string | null } | null;
}

/** Nomes de fabricante que a simples primeira letra maiúscula erra. */
const FABRICANTES: Record<string, string> = {
  openai: "OpenAI",
  "x-ai": "xAI",
  mistralai: "Mistral AI",
  deepseek: "DeepSeek",
  "meta-llama": "Meta",
  nvidia: "NVIDIA",
  qwen: "Qwen",
  anthropic: "Anthropic",
  google: "Google",
};

/** Preço por token (texto da API) → US$ por 1 milhão de tokens. null = não informado. */
function porMilhao(v: string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Number((n * 1e6).toFixed(6));
}

function fabricanteDe(id: string, name: string): string {
  const i = name.indexOf(":");
  if (i > 0) return name.slice(0, i).trim();
  const prefixo = id.replace(/^~/, "").split("/")[0];
  return FABRICANTES[prefixo] ?? (prefixo ? prefixo[0].toUpperCase() + prefixo.slice(1) : "Outros");
}

export function converterModelosOpenRouter(bruto: ModeloBrutoOpenRouter[]): ModeloOpenRouter[] {
  const lista: ModeloOpenRouter[] = [];
  for (const m of bruto) {
    const id = m.id;
    if (!id || id.endsWith(":batch")) continue;
    const precoEntrada = porMilhao(m.pricing?.prompt);
    const precoSaida = porMilhao(m.pricing?.completion);
    // Preço negativo = roteador (auto, jev-router…): o custo depende do modelo escolhido por ele.
    if ((precoEntrada ?? 0) < 0 || (precoSaida ?? 0) < 0) continue;
    const name = (m.name ?? id).trim();
    const i = name.indexOf(":");
    lista.push({
      id,
      nome: i > 0 ? name.slice(i + 1).trim() : name,
      fabricante: fabricanteDe(id, name),
      ouveAudio: m.architecture?.input_modalities?.includes("audio") ?? false,
      precoEntrada,
      precoSaida,
      precoAudio: porMilhao(m.pricing?.audio),
      gratis: id.endsWith(":free") || (precoEntrada === 0 && precoSaida === 0),
      contexto: typeof m.context_length === "number" ? m.context_length : null,
    });
  }
  // Por fabricante e, dentro dele, do mais barato ao mais caro (sem preço vai para o fim).
  return lista.sort(
    (a, b) =>
      a.fabricante.localeCompare(b.fabricante, "pt-BR", { sensitivity: "base" }) ||
      (a.precoEntrada ?? Infinity) - (b.precoEntrada ?? Infinity) ||
      a.nome.localeCompare(b.nome, "pt-BR"),
  );
}
