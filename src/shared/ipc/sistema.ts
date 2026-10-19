export const CANAIS_SISTEMA = {
  INFO: "sistema:info",
  VERIFICAR_ATUALIZACAO: "sistema:verificar-atualizacao",
  ABRIR_LINK: "sistema:abrir-link",
  COPIAR_TEXTO: "sistema:copiar-texto",
  DISPOSITIVOS_AUDIO: "sistema:dispositivos-audio",
  TECLADOS: "sistema:teclados",
} as const;

export interface InfoSistema {
  versao: string;
  plataforma: string;
  /** Pasta dos dados locais (banco, áudios, chaves cifradas). */
  pastaDados: string;
}

export interface ResultadoAtualizacao {
  disponivel: boolean;
  versaoNova: string | null;
  /** Página para baixar (GitHub Releases), quando houver. */
  url: string | null;
  erro: string | null;
}

/** Entrada de áudio como o CoreAudio a vê (só Mac). */
export interface EntradaAudio {
  nome: string;
  uid: string;
  /** "embutido", "bluetooth", "usb", "iphone"… (valor do auxiliar; pode vir um tipo novo). */
  transporte: string;
  /** É a entrada padrão do sistema. */
  padrao: boolean;
  vivo: boolean;
}

export interface DispositivosAudio {
  entradas: EntradaAudio[];
  /** Tampa do notebook fechada; null = Mac sem tampa ou não deu para saber. */
  tampaFechada: boolean | null;
}

export interface TecladoConectado {
  nome: string;
  embutido: boolean;
}

export interface PonteSistema {
  info(): Promise<InfoSistema>;
  verificarAtualizacao(): Promise<ResultadoAtualizacao>;
  /** Abre no navegador padrão (só https://). */
  abrirLink(url: string): Promise<void>;
  /**
   * Copia texto para a área de transferência pelo processo principal. Os botões "Copiar" usam isto em
   * vez de navigator.clipboard: as janelas só têm permissão de microfone e o cartão de resposta não
   * recebe foco, então navigator.clipboard falhava calado.
   */
  copiarTexto(texto: string): Promise<void>;
  /** Entradas de áudio e estado da tampa. null = sem o auxiliar do Mac (Windows) ou falha: a tela segue sem os detalhes. */
  dispositivosAudio(): Promise<DispositivosAudio | null>;
  /** Teclados conectados. null = sem o auxiliar do Mac (Windows) ou falha. */
  teclados(): Promise<TecladoConectado[] | null>;
}
