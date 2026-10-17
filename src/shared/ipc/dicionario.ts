export const CANAIS_DICIONARIO = {
  LISTAR: "dicionario:listar",
  ADICIONAR: "dicionario:adicionar",
  ATUALIZAR: "dicionario:atualizar",
  APAGAR: "dicionario:apagar",
  IMPORTAR_CSV: "dicionario:importar-csv",
  /** main → janelas: a lista mudou (ex.: palavra aprendida sozinha). */
  MUDOU: "dicionario:mudou",
} as const;

export interface PalavraDicionario {
  id: string;
  /** Como a palavra deve ser escrita (ex.: "Lovable", "Supabase", "Manske"). */
  termo: string;
  origem: "manual" | "aprendida" | "importada";
  /** ISO 8601. */
  criadaEm: string;
}

export interface ResultadoImportacao {
  adicionadas: number;
  /** Já existiam ou estavam vazias. */
  ignoradas: number;
}

export interface PonteDicionario {
  listar(busca?: string): Promise<PalavraDicionario[]>;
  /** Erro (rejeita) se o termo já existir ou for vazio. */
  adicionar(termo: string): Promise<PalavraDicionario>;
  atualizar(id: string, termo: string): Promise<PalavraDicionario>;
  apagar(ids: string[]): Promise<void>;
  /** Conteúdo de um CSV/TXT: uma palavra por linha ou na 1ª coluna. */
  importarCsv(conteudo: string): Promise<ResultadoImportacao>;
  aoMudar(cb: () => void): () => void;
}
