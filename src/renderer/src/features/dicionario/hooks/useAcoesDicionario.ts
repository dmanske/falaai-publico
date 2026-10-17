import { useCallback } from "react";
import type { ResultadoImportacao } from "@shared/ipc";
import { apiDicionario, mensagemDeErro } from "../api/ponte";

type Resultado<T = void> = { ok: true; valor: T } | { ok: false; erro: string };

async function tentar<T>(fn: () => Promise<T>): Promise<Resultado<T>> {
  try {
    return { ok: true, valor: await fn() };
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) };
  }
}

/** Ações que mudam o dicionário. A lista se atualiza sozinha pelo aviso do processo principal. */
export function useAcoesDicionario() {
  const adicionar = useCallback((termo: string) => tentar(() => apiDicionario.adicionar(termo)), []);
  const editar = useCallback((id: string, termo: string) => tentar(() => apiDicionario.atualizar(id, termo)), []);
  const apagar = useCallback((ids: string[]) => tentar(() => apiDicionario.apagar(ids)), []);
  const importar = useCallback(
    (conteudo: string): Promise<Resultado<ResultadoImportacao>> => tentar(() => apiDicionario.importarCsv(conteudo)),
    [],
  );
  return { adicionar, editar, apagar, importar };
}
