import type { CSSProperties } from "react";
import type { EstiloPilula } from "@shared/ipc";
import { variaveisDoClube } from "@shared/temas/coresClube";
import { clubePorId } from "@shared/temas/clubes";
import { urlEscudo } from "./escudos";

export interface VisualPilula {
  /** Classes CSS da pílula (ver estilos.css). */
  classe: string;
  /** Variáveis --pil-* (só nos estilos de clube). */
  variaveis?: CSSProperties;
  escudo?: string;
  /** Estilo "original": é o único que mostra o modo mudando a cor da onda (os outros usam um pontinho). */
  original: boolean;
}

/** Transforma a preferência no que a pílula precisa; clube que não existe mais cai no original. */
export function resolverVisual(estilo: EstiloPilula): VisualPilula {
  if (estilo.tipo === "clube") {
    const clube = clubePorId(estilo.id);
    if (clube) {
      return {
        classe: "pil pil-clube",
        variaveis: variaveisDoClube(clube, estilo.variante) as CSSProperties,
        escudo: urlEscudo(clube.escudo),
        original: false,
      };
    }
    return { classe: "pil pil-original", original: true };
  }
  return { classe: `pil pil-${estilo.id}`, original: estilo.id === "original" };
}
