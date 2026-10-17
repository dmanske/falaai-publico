import type { Atalho, IdAtalho } from "../atalhos";

export const CANAIS_PREFERENCIAS = {
  LER: "preferencias:ler",
  SALVAR: "preferencias:salvar",
  /** main → todas as janelas: preferências mudaram (envia o objeto completo). */
  MUDOU: "preferencias:mudou",
} as const;

/** Como o áudio vai dentro da mensagem para a IA. Descoberto pelo teste da chave. */
export type FormatoAudio = "input_audio" | "file";

export type Tema = "sistema" | "claro" | "escuro";

export interface Preferencias {
  // IA
  modelo: string;
  /** null = ainda não testado. */
  formatoAudio: FormatoAudio | null;
  /** Mandar o contexto do app em foco (nome, janela, texto ao redor do cursor) para a IA. */
  usarContexto: boolean;

  // Ditado
  /** Sons de início/fim do ditado. */
  sons: boolean;
  /** Idiomas que o usuário fala (BCP-47, ex.: ["pt-BR", "en"]). Vazio = detectar sozinho. */
  idiomas: string[];
  /** Idioma de destino do modo tradução agora (ex.: "en"). Lembra o último usado. */
  idiomaTraducao: string;
  /**
   * Idiomas favoritos da tradução, na ordem (até MAX_IDIOMAS_TRADUCAO). Durante a gravação, cada
   * toque em ⇧ (segurando Fn) ou clique na sigla da pílula passa para o próximo.
   */
  idiomasTraducao: string[];
  /** deviceId do microfone escolhido; null = o padrão do sistema. Se sumir, cai no padrão. */
  microfoneId: string | null;
  /** Silenciar o som do computador (música, vídeo) enquanto grava. */
  silenciarFundo: boolean;
  atalhos: Record<IdAtalho, Atalho>;

  // Dicionário e histórico
  /** Observar correções feitas logo após colar e adicionar as palavras ao dicionário. */
  aprenderCorrecoes: boolean;
  /** Guardar o áudio de cada ditado (para ouvir e reprocessar). */
  guardarAudio: boolean;
  /** Apagar histórico mais velho que N dias; null = guardar sempre. */
  retencaoDias: number | null;

  // Geral
  abrirComSistema: boolean;
  /** Mac: ícone no Dock. Windows: ícone na barra de tarefas. */
  mostrarNoDock: boolean;
  tema: Tema;
  onboardingConcluido: boolean;
}

export interface PontePreferencias {
  ler(): Promise<Preferencias>;
  salvar(parcial: Partial<Preferencias>): Promise<Preferencias>;
  aoMudar(cb: (p: Preferencias) => void): () => void;
}
