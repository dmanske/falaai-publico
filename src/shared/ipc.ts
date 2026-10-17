// Contrato entre a tela (renderer) e o processo principal.
// Nomes de canal e formatos de dados ficam só aqui; os dois lados importam deste arquivo.

export const CANAIS = {
  CHAVES_STATUS: "chaves:status",
  CHAVES_SALVAR: "chaves:salvar",
  CHAVES_APAGAR: "chaves:apagar",
  PREFERENCIAS_LER: "preferencias:ler",
  PREFERENCIAS_SALVAR: "preferencias:salvar",
  IA_TESTAR: "ia:testar",
} as const;

export type NomeChave = "lovable";

/** O que a tela pode saber de uma chave: nunca o valor inteiro. */
export interface StatusChave {
  configurada: boolean;
  /** Últimos 4 caracteres, para o usuário reconhecer qual chave está salva. */
  final: string | null;
}

/** Como o áudio vai dentro da mensagem para a IA. Descoberto pelo teste da chave. */
export type FormatoAudio = "input_audio" | "file";

export interface Preferencias {
  modelo: string;
  /** null = ainda não testado. */
  formatoAudio: FormatoAudio | null;
}

export interface ResultadoEtapa {
  ok: boolean;
  /** Mensagem em português para mostrar na tela. */
  mensagem: string;
  ms: number;
  /** Texto devolvido pela IA (transcrição, no teste de áudio). */
  resposta?: string;
}

export interface ResultadoTesteIa {
  texto: ResultadoEtapa;
  /** null quando o teste de texto falhou e o de áudio nem foi tentado. */
  audio: (ResultadoEtapa & { formato: FormatoAudio | null }) | null;
}

/** API exposta pelo preload em window.ponte. */
export interface Ponte {
  /** process.platform: "darwin", "win32"… */
  plataforma: string;
  chaves: {
    status(nome: NomeChave): Promise<StatusChave>;
    salvar(nome: NomeChave, valor: string): Promise<StatusChave>;
    apagar(nome: NomeChave): Promise<StatusChave>;
  };
  preferencias: {
    ler(): Promise<Preferencias>;
    salvar(parcial: Partial<Preferencias>): Promise<Preferencias>;
  };
  ia: {
    testar(): Promise<ResultadoTesteIa>;
  };
}
