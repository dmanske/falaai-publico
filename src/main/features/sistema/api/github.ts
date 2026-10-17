// Consulta a última versão publicada no GitHub Releases. Nunca lança.
import { app } from "electron";
import { REPO_ATUALIZACOES } from "@shared/config";
import type { ResultadoAtualizacao } from "@shared/ipc";
import { ehMaisNova } from "../lib/versao";

const TIMEOUT_MS = 10_000;

export async function verificarAtualizacao(): Promise<ResultadoAtualizacao> {
  const falha = (erro: string): ResultadoAtualizacao => ({ disponivel: false, versaoNova: null, url: null, erro });
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO_ATUALIZACOES}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "FalaAi" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (r.status === 404) return falha("Nenhuma versão publicada ainda (ou o repositório é privado).");
    if (!r.ok) return falha(`O GitHub respondeu com erro ${r.status}.`);
    const dados = (await r.json()) as { tag_name?: string; html_url?: string };
    const tag = dados.tag_name;
    if (!tag) return falha("Resposta inesperada do GitHub.");
    const nova = ehMaisNova(tag, app.getVersion());
    return {
      disponivel: nova,
      versaoNova: nova ? tag.replace(/^v/i, "") : null,
      url: nova ? (dados.html_url ?? `https://github.com/${REPO_ATUALIZACOES}/releases/latest`) : null,
      erro: null,
    };
  } catch (e) {
    const timeout = (e as Error).name === "TimeoutError" || (e as Error).name === "AbortError";
    return falha(timeout ? "Sem resposta do GitHub (tempo esgotado). Verifique a internet." : "Não deu para consultar o GitHub. Verifique a internet.");
  }
}
