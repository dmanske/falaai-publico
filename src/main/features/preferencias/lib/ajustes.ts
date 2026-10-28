// Ajustes únicos nas preferências salvas: quando o padrão de uma opção muda numa versão nova, quem já tinha a
// opção salva (com o padrão antigo) recebe o novo valor UMA vez. Depois disso, a escolha do usuário vale.
// O id de cada ajuste aplicado fica em `ajustesAplicados`; nunca reaproveite um id.
import type { Preferencias } from "@shared/ipc";

export interface AjusteUnico {
  id: string;
  mudar: Partial<Preferencias>;
}

export const AJUSTES: AjusteUnico[] = [
  // 1.1.3: o FalaAi fica só na barra de menus, fora do Dock (o padrão até a 1.1.2 era mostrar no Dock).
  { id: "dock-desligado-1.1.3", mudar: { mostrarNoDock: false } },
];

/** O que falta gravar nas preferências para aplicar os ajustes pendentes; null = nada a fazer. */
export function ajustesPendentes(
  prefs: Pick<Preferencias, "ajustesAplicados">,
  ajustes: AjusteUnico[] = AJUSTES,
): Partial<Preferencias> | null {
  const faltam = ajustes.filter((a) => !prefs.ajustesAplicados.includes(a.id));
  if (faltam.length === 0) return null;
  return Object.assign({}, ...faltam.map((a) => a.mudar), {
    ajustesAplicados: [...prefs.ajustesAplicados, ...faltam.map((a) => a.id)],
  });
}
