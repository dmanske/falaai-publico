// Tradução dos erros HTTP dos provedores para mensagens em português.
// Função pura (sem rede e sem Electron): testada em erros.test.ts.

/** Nomes (do catálogo) que pedem artigo feminino: "pela Lovable", "pela OpenAI"… */
const NOMES_FEMININOS = ["Lovable", "OpenAI", "Anthropic", "Mistral"];

function artigo(nome: string): "o" | "a" {
  return NOMES_FEMININOS.some((n) => nome.startsWith(n)) ? "a" : "o";
}

/**
 * Tira a mensagem do corpo de erro. Os provedores usam formatos diferentes:
 * {"error":{"message"}}, {"error":"texto"}, {"detail":"texto"}, {"detail":{"message"}},
 * {"message"}, {"err_msg"} (Deepgram) e o Gemini compatível devolve tudo DENTRO DE UM ARRAY.
 */
export function extrairDetalhe(corpo: string): string {
  let detalhe = corpo.trim();
  try {
    const bruto = JSON.parse(corpo) as unknown;
    const j = (Array.isArray(bruto) ? bruto[0] : bruto) as Record<string, unknown> | null;
    const texto = (v: unknown): string | undefined => {
      if (typeof v === "string") return v;
      if (v && typeof v === "object" && typeof (v as { message?: unknown }).message === "string") {
        return (v as { message: string }).message;
      }
      return undefined;
    };
    if (j && typeof j === "object") {
      detalhe = texto(j.error) ?? texto(j.detail) ?? texto(j.message) ?? texto(j.err_msg) ?? detalhe;
    }
  } catch {
    // corpo que não é JSON (página HTML, texto): usa como veio
  }
  return detalhe.replace(/\s+/g, " ").slice(0, 300);
}

/** Mensagem de erro de chave ("API key not valid", "Incorrect API key"…) vinda num 400. */
const PARECE_ERRO_DE_CHAVE = /api[ _-]?key|chave|authenticat|credential|unauthori|invalid.{0,20}token|access.{0,10}denied/i;

/** Sem créditos / cota esgotada (a OpenAI devolve 429 com "insufficient_quota"). */
const PARECE_SEM_CREDITO = /quota|billing|credit|insufficient|balance/i;

/**
 * Explica um erro HTTP de um provedor. `nome` é o nome do catálogo ("Google Gemini", "Groq"…).
 * O detalhe do provedor vai sempre entre parênteses: foi ele que mostrou a causa da chave suja
 * ("Invalid API key. The key could not be decrypted").
 */
export function explicarErro(nome: string, status: number, corpo: string): string {
  const detalhe = extrairDetalhe(corpo);
  const a = artigo(nome);
  const chaveRecusada = status === 401 || status === 403 || (status === 400 && PARECE_ERRO_DE_CHAVE.test(detalhe));
  let motivo: string;
  if (chaveRecusada) {
    motivo = `Chave recusada pel${a} ${nome}.`;
  } else if (status === 402 || (status === 429 && PARECE_SEM_CREDITO.test(detalhe))) {
    motivo = `Sem créditos na conta d${a} ${nome}.`;
  } else if (status === 404) {
    motivo = `Modelo não encontrado n${a} ${nome}.`;
  } else if (status === 413) {
    motivo = `O áudio é grande demais para ${a === "a" ? "a" : "o"} ${nome}.`;
  } else if (status === 429) {
    motivo = "Limite de uso atingido; tente de novo em instantes.";
  } else {
    motivo = `Erro ${status} d${a} ${nome}.`;
  }
  return detalhe ? `${motivo} (${status}: ${detalhe})` : `${motivo} (${status})`;
}

/** Erro de rede (sem resposta HTTP): tempo esgotado ou conexão. */
export function explicarFalhaDeRede(e: unknown): string {
  const erro = e as { name?: string; message?: string };
  if (erro?.name === "TimeoutError" || erro?.name === "AbortError") return "A IA demorou demais para responder.";
  return `Falha de conexão: ${erro?.message ?? String(e)}`;
}
