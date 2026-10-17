import { useEffect } from "react";
import type { Preferencias } from "@shared/ipc";
import { clubeDoEstilo } from "@shared/temas/clubes";
import { cssTemaDoClube } from "@shared/temas/coresClube";
import { urlEscudo } from "@/features/pilula";
import { apiPreferencias } from "../api/ponte";

const ID_ESTILO = "cores-do-clube";

/**
 * Com um clube na pílula e "Usar as cores do clube no app" ligado: tokens de destaque na cor do clube,
 * classe `tema-clube` no <html> (menu lateral com o padrão da camisa, faixa no topo e escudo no canto —
 * regras em estilos.css) e as variáveis que essas regras leem. Sem isso, tudo sai e o app volta ao padrão.
 */
export function useCoresDoTema(): void {
  useEffect(() => {
    const aplicar = (p: Pick<Preferencias, "estiloPilula" | "coresDoClubeNoApp">) => {
      const clube = p.coresDoClubeNoApp ? clubeDoEstilo(p.estiloPilula) : undefined;
      let tag = document.getElementById(ID_ESTILO);
      document.documentElement.classList.toggle("tema-clube", !!clube);
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
      const escudo = urlEscudo(clube.escudo);
      tag.textContent = `${cssTemaDoClube(clube)}:root{--clube-escudo:${escudo ? `url("${escudo}")` : "none"};}`;
    };
    void apiPreferencias.ler().then(aplicar);
    const cancelar = apiPreferencias.aoMudar(aplicar);
    return () => {
      cancelar();
      document.getElementById(ID_ESTILO)?.remove();
      document.documentElement.classList.remove("tema-clube");
    };
  }, []);
}
