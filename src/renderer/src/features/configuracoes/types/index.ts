import type { Preferencias } from "@shared/ipc";

export type SecaoConfig = "geral" | "pilula" | "atalhos" | "envio" | "idiomas" | "audio" | "dados" | "ia" | "permissoes" | "sobre";

/** Propriedades comuns das seções que editam preferências. */
export interface PropsSecaoPreferencias {
  preferencias: Preferencias;
  salvar(parcial: Partial<Preferencias>): Promise<void>;
}

/** App já usado para ditar (montado do histórico), para a lista do envio automático. */
export interface AppUsado {
  appId: string;
  nome: string;
  usos: number;
  /** Parece app de conversa (Enter envia a mensagem). */
  comum: boolean;
}
