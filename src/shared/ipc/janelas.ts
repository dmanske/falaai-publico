export const CANAIS_JANELAS = {
  ABRIR_HUB: "janelas:abrir-hub",
  /** main → hub: ir para uma página (ex.: clique no menu da bandeja). */
  NAVEGAR: "janelas:navegar",
  CONCLUIR_ONBOARDING: "janelas:concluir-onboarding",
  /** cartão de resposta (modo pergunte). */
  CARTAO_CONTEUDO: "janelas:cartao-conteudo",
  CARTAO_FECHAR: "janelas:cartao-fechar",
} as const;

export type PaginaHub = "inicio" | "historico" | "dicionario" | "novidades" | "configuracoes";

export interface ConteudoCartao {
  /** O que a pessoa perguntou/pediu (transcrição do comando). */
  pergunta: string;
  resposta: string;
}

export interface PonteJanelas {
  abrirHub(pagina?: PaginaHub): Promise<void>;
  aoNavegar(cb: (pagina: PaginaHub) => void): () => void;
  /** Fecha o onboarding e abre o hub. */
  concluirOnboarding(): Promise<void>;
  aoConteudoCartao(cb: (c: ConteudoCartao) => void): () => void;
  fecharCartao(): void;
}
