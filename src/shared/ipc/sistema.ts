export const CANAIS_SISTEMA = {
  INFO: "sistema:info",
  VERIFICAR_ATUALIZACAO: "sistema:verificar-atualizacao",
  ABRIR_LINK: "sistema:abrir-link",
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
}
