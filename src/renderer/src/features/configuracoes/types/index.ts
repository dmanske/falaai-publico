import type { Preferencias } from "@shared/ipc";

export type SecaoConfig = "geral" | "atalhos" | "idiomas" | "audio" | "dados" | "ia" | "permissoes" | "sobre";

/** Propriedades comuns das seções que editam preferências. */
export interface PropsSecaoPreferencias {
  preferencias: Preferencias;
  salvar(parcial: Partial<Preferencias>): Promise<void>;
}
