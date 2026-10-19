// Aviso "FalaAi atualizado" na pílula, uma vez por versão. A página Novidades fica no hub
// (renderer/src/features/novidades); abrir a página também marca a versão como vista.
import { app } from "electron";
import {
  AVISO_NOVIDADES_ATRASO_MS,
  AVISO_NOVIDADES_MS,
  AVISO_NOVIDADES_REPETIR_MS,
  AVISO_NOVIDADES_TENTATIVAS,
  NOME_APP,
} from "@shared/config";
import { NOVIDADES } from "@shared/novidades";
import { mostrarAvisoNaPilula } from "../ditado";
import { lerPreferencias, salvarPreferencias } from "../preferencias";

/** Chamar uma vez, depois de criar a pílula e iniciar o ditado. */
export function iniciarAvisoNovidades(): void {
  const versao = app.getVersion();
  const prefs = lerPreferencias();

  // Instalação nova: não tem "o que mudou" para mostrar.
  if (!prefs.onboardingConcluido) {
    salvarPreferencias({ novidadesVistas: versao });
    return;
  }
  if (prefs.novidadesVistas === versao) return;
  // Versão sem entrada em NOVIDADES (o teste novidades.test.ts impede isso): não avisa.
  if (!NOVIDADES.some((n) => n.versao === versao)) return;

  const tentar = (restantes: number): void => {
    // A página pode ter sido aberta nesse meio tempo: aí o aviso já não faz sentido.
    if (lerPreferencias().novidadesVistas === versao) return;
    const mostrou = mostrarAvisoNaPilula(`${NOME_APP} atualizado para ${versao}.`, { id: "ver-novidades", rotulo: "Ver novidades" }, AVISO_NOVIDADES_MS);
    if (mostrou) salvarPreferencias({ novidadesVistas: versao });
    else if (restantes > 1) setTimeout(() => tentar(restantes - 1), AVISO_NOVIDADES_REPETIR_MS);
  };
  setTimeout(() => tentar(AVISO_NOVIDADES_TENTATIVAS), AVISO_NOVIDADES_ATRASO_MS);
}
