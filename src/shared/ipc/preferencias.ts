import type { Atalho, IdAtalho } from "../atalhos";
import type { IdProvedor, IdTranscricao } from "../provedores";
import type { VarianteClube } from "../temas/clubes";
import type { IdEstiloPilula } from "../temas/estilosPilula";

export const CANAIS_PREFERENCIAS = {
  LER: "preferencias:ler",
  SALVAR: "preferencias:salvar",
  /** main → todas as janelas: preferências mudaram (envia o objeto completo). */
  MUDOU: "preferencias:mudou",
} as const;

/** Como o áudio vai dentro da mensagem para a IA. Descoberto pelo teste da chave. */
export type FormatoAudio = "input_audio" | "file";

export type Tema = "sistema" | "claro" | "escuro";

/** Fundo do hub: "topo" = ondas atrás do título; "completo" = ondas em cima e embaixo; "nenhum" = só o pontilhado. */
export type FundoHub = "topo" | "completo" | "nenhum";

/**
 * Visual da pílula: um estilo geral (catálogo em src/shared/temas/estilosPilula.ts) ou um clube com uma
 * das 3 variantes (catálogo em src/shared/temas/clubes.ts).
 */
export type EstiloPilula = { tipo: "estilo"; id: IdEstiloPilula } | { tipo: "clube"; id: string; variante: VarianteClube };

export interface Preferencias {
  // IA (catálogo em src/shared/provedores.ts)
  /** Quem limpa o texto (e, se ouve áudio, também transcreve). */
  provedor: IdProvedor;
  /** Modelo escolhido em cada provedor (lembra a escolha ao trocar de provedor). */
  modeloPorProvedor: Partial<Record<IdProvedor, string>>;
  /** Modelo do provedor atual (= modeloPorProvedor[provedor]; mantido por compatibilidade). */
  modelo: string;
  /** Serviço de transcrição quando o modelo não ouve áudio; null = ainda não escolhido. */
  transcricao: IdTranscricao | null;
  /** Modelo escolhido em cada serviço de transcrição. */
  modeloPorTranscricao: Partial<Record<IdTranscricao, string>>;
  /** null = ainda não testado. */
  formatoAudio: FormatoAudio | null;
  /** Mandar o contexto do app em foco (nome, janela, texto ao redor do cursor) para a IA. */
  usarContexto: boolean;
  /** Mandar também a conversa em volta do campo e o texto da janela (só vale com `usarContexto`). */
  lerTela: boolean;

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
  /** Mac: toque rápido no atalho NÃO liga o mãos livres; precisa de dois toques (TOQUE_DUPLO_MS). */
  maosLivresComToqueDuplo: boolean;
  /** Mac, no "pergunte": se o app não informa a seleção, aperta Cmd+C e devolve a área de transferência. */
  copiarSelecao: boolean;
  /** Colar listas como HTML (listas de verdade) nos apps que aceitam; os outros recebem o texto. */
  colarFormatado: boolean;

  // Envio automático (Enter depois de colar)
  /** Apps (appId: bundle id no Mac / exe no Windows) onde o FalaAi aperta Enter sozinho depois de colar. */
  enviarNosApps: string[];
  /** Terminar a fala com o comando "enviar"/"manda" aperta Enter naquela vez (em qualquer app). */
  enviarPorVoz: boolean;

  // Dicionário e histórico
  /** Observar correções feitas logo após colar e adicionar as palavras ao dicionário. */
  aprenderCorrecoes: boolean;
  /** Guardar o áudio de cada ditado (para ouvir e reprocessar). */
  guardarAudio: boolean;
  /** Apagar histórico mais velho que N dias; null = guardar sempre. */
  retencaoDias: number | null;

  // Geral
  abrirComSistema: boolean;
  /** Ao iniciar, abrir a janela principal. Desligado = só o ícone na barra de menus/bandeja. */
  abrirJanelaAoIniciar: boolean;
  /** Mac: ícone no Dock. Windows: ícone na barra de tarefas. */
  mostrarNoDock: boolean;
  tema: Tema;
  fundo: FundoHub;
  /** Visual da pílula (Configurações > Pílula). */
  estiloPilula: EstiloPilula;
  /** Com um clube na pílula, usar as cores dele como destaque do app também. Sem efeito nos estilos gerais. */
  coresDoClubeNoApp: boolean;
  onboardingConcluido: boolean;
}

export interface PontePreferencias {
  ler(): Promise<Preferencias>;
  salvar(parcial: Partial<Preferencias>): Promise<Preferencias>;
  aoMudar(cb: (p: Preferencias) => void): () => void;
}
