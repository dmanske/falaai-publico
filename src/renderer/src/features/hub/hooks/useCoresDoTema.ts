import { useEffect } from "react";
import type { Preferencias } from "@shared/ipc";
import { clubeDoEstilo } from "@shared/temas/clubes";
import { cssDestaqueDoClube } from "@shared/temas/coresClube";
import { apiPreferencias } from "../api/ponte";

const ID_ESTILO = "cores-do-clube";

/**
 * Com um clube na pílula e "Usar as cores do clube no app" ligado, sobrescreve os tokens de destaque
 * (--color-destaque, -claro, -2, -3) com a cor do clube, no claro e no escuro. Sem isso, remove a
 * sobrescrita e o app volta ao azul do FalaAi.
 */
export function useCoresDoTema(): void {
  useEffect(() => {
    const aplicar = (p: Pick<Preferencias, "estiloPilula" | "coresDoClubeNoApp">) => {
      const clube = p.coresDoClubeNoApp ? clubeDoEstilo(p.estiloPilula) : undefined;
      let tag = document.getElementById(ID_ESTILO);
      if (!clube) {
        tag?.remove();
        return;
      }
      if (!tag) {
        tag = document.createElement("style");
        tag.id = ID_ESTILO;
        // No fim do <head>: precisa vir depois do tema para vencer o `:root` dos tokens.
        document.head.appendChild(tag);
      }
      tag.textContent = cssDestaqueDoClube(clube.cores);
    };
    void apiPreferencias.ler().then(aplicar);
    const cancelar = apiPreferencias.aoMudar(aplicar);
    return () => {
      cancelar();
      document.getElementById(ID_ESTILO)?.remove();
    };
  }, []);
}
