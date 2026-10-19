# Módulo: Novidades (histórico de versões)

**Desde:** 1.1.0 (18/10/2026). Pedido do Daniel: "um histórico no aplicativo cada vez que a gente atualizar, pra gente
saber a data e o que foi arrumado".

## Como funciona

- **Conteúdo:** `src/shared/novidades.ts` (`NOVIDADES`), uma entrada por versão, a mais nova primeiro: versão, data
  (`AAAA-MM-DD`) e uma frase por mudança, em linguagem de quem usa. É a única fonte; não há outro changelog.
- **Página:** "Novidades" no menu lateral do app e no menu da barra (`src/renderer/src/features/novidades/`). A versão
  instalada aparece marcada.
- **Aviso depois de atualizar:** na primeira abertura de uma versão nova, a pílula mostra "FalaAi atualizado para
  X.Y.Z." com o botão **Ver novidades** (`src/main/features/novidades/`). Uma vez por versão, guardada em
  `preferencias.novidadesVistas`; só com o ditado parado. Instalação nova (onboarding ainda não concluído) não avisa.

## Ao lançar uma versão

1. Subir `version` no `package.json` (e no `package-lock.json`).
2. Acrescentar a entrada no topo de `src/shared/novidades.ts`. O teste `src/shared/novidades.test.ts` falha se a versão
   do `package.json` não tiver entrada, se a ordem estiver errada ou se a data for inválida.
3. Commit e tag `vX.Y.Z`.

Regra também em [../ARQUITETURA.md](../ARQUITETURA.md) (seção Git) e em `.kiro/steering/arquitetura-projeto.md`.
