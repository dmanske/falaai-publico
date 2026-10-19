export const CANAIS_PILULA = {
  /** main → pílula: o que fazer com o microfone. */
  COMANDO: "pilula:comando",
  /** main → pílula: o que mostrar. */
  ESTADO: "pilula:estado",
  /** pílula → main: gravação terminada (WAV) ou falha. */
  AUDIO: "pilula:audio",
  /** pílula → main: clique no ✓ (terminar e colar), no ✕ (cancelar) ou na sigla do idioma. */
  ACAO: "pilula:acao",
  /** pílula → main: microfones que o navegador enxerga (o processo principal não lista). */
  MICROFONES: "pilula:microfones",
} as const;

export type ModoDitado = "ditado" | "pergunte" | "traducao";

export type ComandoPilula =
  | { acao: "iniciar"; sessao: number; sons: boolean; microfoneId: string | null }
  | { acao: "parar"; sessao: number; sons: boolean }
  /** `devolverAudio`: para a gravação e manda o WAV pelo canal AUDIO (para o "Desfazer" e o "cancelado" do Histórico). */
  | { acao: "cancelar"; sessao: number; sons: boolean; devolverAudio: boolean };

/** Botão ao lado da mensagem de erro/aviso. O clique volta como a ação de mesmo id. */
export interface AcaoMensagemPilula {
  id: "tentar-de-novo" | "copiar" | "desfazer" | "ver-novidades";
  rotulo: string;
}

export type EstadoPilula =
  | { estado: "oculta" }
  /**
   * `idioma`: sigla do destino no modo tradução (ex.: "EN"); null nos outros modos.
   * `restanteS`: segundos que faltam para o limite da gravação (só nos últimos segundos); null = não mostra.
   */
  | { estado: "gravando"; modo: ModoDitado; maosLivres: boolean; idioma: string | null; restanteS?: number | null }
  /** `nota`: texto no lugar dos pontinhos (ex.: "Demorando mais que o normal…"). */
  | { estado: "processando"; modo: ModoDitado; idioma: string | null; nota?: string | null }
  | { estado: "erro"; mensagem: string; acao?: AcaoMensagemPilula }
  /** Aviso curto e neutro (ex.: "Palavra adicionada ao dicionário: Lovable"). */
  | { estado: "aviso"; mensagem: string; acao?: AcaoMensagemPilula };

export type AcaoPilula = "confirmar" | "cancelar" | "proximo-idioma" | "microfone-mudo" | "tentar-de-novo" | "copiar" | "desfazer" | "ver-novidades";

/** Microfone listado pela pílula (id do navegador + nome). */
export interface MicrofoneListado {
  id: string;
  nome: string;
}

export type AudioPilula =
  | { sessao: number; ok: true; wav: ArrayBuffer; duracaoMs: number }
  | { sessao: number; ok: false; erro: string };

/** Usado só pela janela da pílula. Os "ao…" devolvem a função que desliga o ouvinte. */
export interface PontePilula {
  aoComando(cb: (c: ComandoPilula) => void): () => void;
  aoEstado(cb: (e: EstadoPilula) => void): () => void;
  enviarAudio(a: AudioPilula): void;
  acao(acao: AcaoPilula): void;
  enviarMicrofones(lista: MicrofoneListado[]): void;
}
