// Lista de modelos do OpenRouter (endpoint público, sem chave) com cache de 24 h:
// em memória e em <userData>/openrouter-modelos.json. Sem internet, devolve o cache antigo.
import type { ListaOpenRouter, ModeloOpenRouter } from "@shared/ipc";
import { gravarJson, lerJson } from "../../../lib/arquivoJson";
import { converterModelosOpenRouter, type ModeloBrutoOpenRouter } from "./openrouterConversao";

const URL_MODELOS = "https://openrouter.ai/api/v1/models?output_modalities=text";
const ARQUIVO_CACHE = "openrouter-modelos.json";
/** Quanto tempo a lista em cache vale (ms). */
const VALIDADE_CACHE_MS = 24 * 60 * 60 * 1000;
const TIMEOUT_LISTA_MS = 15_000;

interface Entrada {
  modelos: ModeloOpenRouter[];
  atualizadoEm: string;
}
/** "audio" = só os que ouvem áudio; "todos" = inclui os só de texto. */
type Cache = { audio?: Entrada; todos?: Entrada };

let memoria: Cache | null = null;

function cache(): Cache {
  memoria ??= lerJson<Cache>(ARQUIVO_CACHE, {});
  return memoria;
}

const recente = (e: Entrada) => Date.now() - Date.parse(e.atualizadoEm) < VALIDADE_CACHE_MS;

export async function listarModelosOpenRouter(opcoes?: { todos?: boolean; recarregar?: boolean }): Promise<ListaOpenRouter> {
  const chave = opcoes?.todos ? "todos" : "audio";
  const guardado = cache()[chave];
  if (guardado && !opcoes?.recarregar && recente(guardado)) return { ...guardado, erro: null };

  try {
    const url = opcoes?.todos ? URL_MODELOS : `${URL_MODELOS}&input_modalities=audio`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_LISTA_MS) });
    if (!resp.ok) throw new Error(`o OpenRouter respondeu ${resp.status}`);
    const json = (await resp.json()) as { data?: ModeloBrutoOpenRouter[] };
    const entrada: Entrada = { modelos: converterModelosOpenRouter(json.data ?? []), atualizadoEm: new Date().toISOString() };
    const novo: Cache = { ...cache(), [chave]: entrada };
    memoria = novo;
    try {
      gravarJson(ARQUIVO_CACHE, novo);
    } catch {
      // sem permissão de escrita: segue só com o cache em memória
    }
    return { ...entrada, erro: null };
  } catch (e) {
    const motivo = `Não consegui atualizar a lista do OpenRouter (${(e as Error).message}).`;
    return guardado
      ? { ...guardado, erro: `${motivo} Mostrando a lista guardada.` }
      : { modelos: [], atualizadoEm: new Date(0).toISOString(), erro: motivo };
  }
}

/**
 * Este modelo do OpenRouter ouve áudio, segundo a lista em cache (qualquer idade)?
 * null = o modelo não está no cache (quem chama usa o catálogo).
 */
export function openRouterOuveAudio(id: string): boolean | null {
  const c = cache();
  const achado = c.todos?.modelos.find((m) => m.id === id) ?? c.audio?.modelos.find((m) => m.id === id);
  return achado ? achado.ouveAudio : null;
}
