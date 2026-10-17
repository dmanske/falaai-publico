export const CANAIS_SISTEMA = {
  INFO: "sistema:info",
  VERIFICAR_ATUALIZACAO: "sistema:verificar-atualizacao",
  ABRIR_LINK: "sistema:abrir-link",
  COPIAR_TEXTO: "sistema:copiar-texto",
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
}
