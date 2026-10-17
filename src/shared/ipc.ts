// Contrato entre a tela (renderer) e o processo principal.
// Nomes de canal e formatos de dados ficam só aqui; os dois lados importam deste arquivo.

export const CANAIS = {
  CHAVES_STATUS: "chaves:status",
  CHAVES_SALVAR: "chaves:salvar",
  CHAVES_APAGAR: "chaves:apagar",
  PREFERENCIAS_LER: "preferencias:ler",
  PREFERENCIAS_SALVAR: "preferencias:salvar",
  IA_TESTAR: "ia:testar",
  PERMISSOES_LER: "permissoes:ler",
  PERMISSOES_PEDIR: "permissoes:pedir",
  /** main → pílula: o que fazer com o microfone. */
  PILULA_COMANDO: "pilula:comando",
  /** main → pílula: o que mostrar. */
  PILULA_ESTADO: "pilula:estado",
  /** pílula → main: gravação terminada (WAV) ou falha. */
  PILULA_AUDIO: "pilula:audio",
  /** pílula → main: clique no ✓ (terminar e colar) ou no ✕ (cancelar). */
  PILULA_ACAO: "pilula:acao",
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
  /** Sons de início/fim do ditado. */
  sons: boolean;
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

export interface StatusPermissoes {
  plataforma: string;
  microfone: "concedida" | "negada" | "nao-perguntada" | "restrita" | "desconhecida";
  /** Acessibilidade (Mac): ler o teclado e colar. null = auxiliar nativo indisponível. */
  acessibilidade: boolean | null;
  /** Leitura do teclado ativa (Fn funcionando). */
  tecladoAtivo: boolean;
  /**
   * Mac: o que a tecla 🌐/Fn faz sozinha (Ajustes > Teclado). "nada" é o ideal; "emoji",
   * "ditado" ou "idioma" atrapalham o FalaAi. null = não se aplica / não deu para ler.
   */
  teclaFnDoSistema: "nada" | "idioma" | "emoji" | "ditado" | null;
  /** Mensagem de erro do auxiliar nativo, se ele não subiu. */
  erroAuxiliar: string | null;
}

export type ComandoPilula =
  | { acao: "iniciar"; sessao: number; sons: boolean }
  | { acao: "parar"; sessao: number; sons: boolean }
  | { acao: "cancelar"; sessao: number; sons: boolean };

export type EstadoPilula =
  | { estado: "oculta" }
  | { estado: "gravando"; maosLivres: boolean }
  | { estado: "processando" }
  | { estado: "erro"; mensagem: string };

export type AudioPilula =
  | { sessao: number; ok: true; wav: ArrayBuffer; duracaoMs: number }
  | { sessao: number; ok: false; erro: string };

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
  permissoes: {
    ler(): Promise<StatusPermissoes>;
    pedir(qual: "microfone" | "acessibilidade" | "ajustes-teclado"): Promise<StatusPermissoes>;
  };
  /** Usado só pela janela da pílula. Os "on" devolvem a função que desliga o ouvinte. */
  pilula: {
    aoComando(cb: (c: ComandoPilula) => void): () => void;
    aoEstado(cb: (e: EstadoPilula) => void): () => void;
    enviarAudio(a: AudioPilula): void;
    acao(acao: "confirmar" | "cancelar"): void;
  };
}
