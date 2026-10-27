# Correção: a pílula parou de aparecer, mas o ditado funcionava (27/10/2026)

**Pedido do Daniel:** "Não está aparecendo mais a nossa pílula aqui para mim, só está aparecendo esse microfone lá em
cima quando eu aperto FN. Por quê?" Versão corrigida: 1.1.2.

## O que acontecia

O FalaAi 1.1.1 estava aberto desde 25/10 às 16:35. Em 27/10 o Fn gravava, a IA respondia e o texto era colado, mas a
pílula não aparecia. O microfone laranja da barra é o aviso de privacidade do macOS e não tinha a ver com isso.

## Evidência

- **O ditado funcionava:** a própria mensagem do Daniel foi ditada (histórico, 07:54, 7.320 ms, `ok`). No registro do
  sistema (`/usr/bin/log show`), o auxiliar silenciou o som às 07:54:15,7, devolveu às 07:54:22,9 (7,2 s de gravação)
  e colou às 07:54:24,9.
- **A janela recebia os estados, mas não ia para a tela:** vigiando a janela "Pílula" (id 114) a cada 50 ms durante 4
  ditados, o tamanho mudou certo (144×38 gravando, 340×38 processando, 300×38 nos avisos) e `kCGWindowIsOnscreen`
  ficou `false` o tempo todo.
- **Mostrada, mas em nenhuma mesa:** no ditado das 08:03:51, pelas funções do SkyLight, `SLSWindowIsOrderedIn = 1` (o
  `showInactive()` chegou ao WindowServer) e `SLSCopySpacesForWindows = []`. A Acessibilidade também não listava a
  janela. Comparação no mesmo momento:

  | Janela | Marca "todas as mesas" (bit 11 das tags) | Mesas |
  |---|---|---|
  | Pílula do FalaAi (id 114) | sim | `[]` |
  | Mesa do Finder (id 77) | sim | `[8]` (a ativa) |

- **Descartado:** Fn chamando o ditado da Apple (`AppleFnUsageType = 0`, "Não fazer nada"); app ocultado
  (`NSRunningApplication.isHidden = false`); app em tela cheia (mesa ativa do tipo 0, comum); posição fora da tela
  (x=648, y=799 numa tela de 1440 px); atualização do macOS (27.0.1 instalado em 07/10, antes da pílula funcionar de
  17 a 20/10).
- **Provável gatilho, não provado:** 344 eventos de repouso/despertar (`pmset -g log`) desde que o app abriu. A janela
  escondida e mostrada a cada ditado acabou perdendo a mesa em algum deles.
- **Reiniciar resolveu:** a janela nova (id 30429) nasceu em `[8]` e apareceu (foto da tela às 08:09:51). Um detalhe
  que serve de diagnóstico: escondida, a janela nova continuava com `[8]`; a quebrada já tinha `[]` mesmo escondida.

## Comparação com o Typeless 2.8.3

Processo principal desembaralhado com `scripts/engenharia-reversa/desembaralhar.py` (só leitura; posições no arquivo
de saída). Janela do floating bar: classe `yg`.

| | Typeless 2.8.3 | FalaAi 1.1.1 |
|---|---|---|
| Entre ditados | a janela **nunca é escondida**: `setExpanded(false)` → `moveWindowToDisplay` → `setBounds({width: mg, height: fg})` com `mg=0x1`, `fg=0x1` (~228545 e ~230476), e `setIgnoreMouseEvents(true)` | `hide()` / `showInactive()` |
| `setVisibleOnAllWorkspaces` | `{visibleOnFullScreen: true, skipTransformProcessType: true}` (`createWindow`, ~230078) | sem `skipTransformProcessType` |
| Mission Control | `setHiddenInMissionControl(true)` | — |
| Cartão de resposta | `closeInteractiveCard` → `closeWindow()` (~387804): fecha e cria outro na próxima vez | `hide()` e reaproveita |
| Despertar/desbloquear | `powerMonitor` `resume`/`unlock-screen` só zeram as teclas pressionadas (~614900); a janela não é tocada | nada |

`showInactive` aparece 0 vezes no Typeless. Os `hide()` que existem são do caso "app de música em foco" (`S_`, ~606237).
Sem `skipTransformProcessType`, o Electron 44 avisa na própria documentação (`electron.d.ts`,
`VisibleOnAllWorkspacesOptions`) que cada chamada troca o tipo do processo e "esconde a janela e o Dock por um
instante".

## Correção (1.1.2)

- `src/main/janelas/pilula.ts`: a janela é mostrada uma vez, ao ser criada, e nunca mais escondida. Sem ditado,
  `recolher()` a deixa com 1×1 px no canto de cima da área útil e `setIgnoreMouseEvents(true)`; no ditado volta ao
  tamanho do estado e passa a receber cliques. A escolha da tela pelo mouse usa a variável `expandida` (antes,
  `isVisible()`). `skipTransformProcessType: true` e `setHiddenInMissionControl(true)`.
- `src/main/janelas/cartao.ts`: as mesmas duas opções, e o cartão é **fechado** (`close()`) em vez de escondido; o
  próximo Pergunte cria outra janela, como o Typeless.
- Exame da janela: `scripts/diagnostico/pilula-mesas.swift` (uma leitura, ou `… 60` para vigiar 60 s). Saudável:
  `OK`, `naTela=true` e a mesa ativa em `mesas`.

Efeito visível: a pílula some na hora no fim do ditado. Antes o macOS a esmaecia em ~0,2 s ao escondê-la.

## Verificação

- `npm run typecheck` sem erros; `npm test`: 209 passando.
- Pacote 1.1.2 (`release/mac-arm64`): versão 1.1.2, certificado `H"5f763d8b…"` (o mesmo, mantém a Acessibilidade),
  arm64, e o código novo dentro do `app.asar` (`skipTransformProcessType: true` ×2, `setHiddenInMissionControl` ×2).
- Instalado no Mac do Daniel às 08:19 (a 1.1.1 ficou guardada fora de `/Applications`; também está na Release do
  GitHub). Exame logo depois de abrir: `OK id=30548 naTela=true orderedIn=1 mesas=[8] mesaAtiva=8 AX=["Pílula"]
  janela=0,29 1x1`.

**Uso real (27/10/2026, 08:29):** 4 ditados (3 no Kiro, 1 no Finder), todos colados (histórico, `ok`). O exame
vigiou 10 min e todas as leituras deram `OK`, com a mesa ativa `[8]`: 1×1 em `0,29` entre ditados, 144×38 em `648,799`
gravando e processando, e 400×38 no aviso "Não achei um campo de texto" com o botão Copiar, no Finder.

**Falta conferir no uso real:** os botões ✕ e ✓, o 1×1 não atrapalhando
cliques no canto da tela, a pílula por cima de um app em tela cheia (inclusive com o ícone no Dock ligado, que agora
não tem mais a troca de tipo do processo) e, o principal, se continua aparecendo depois de vários dias de repousos.

## Como reverter

Em `pilula.ts`, trocar `recolher()` por `janela.hide()` em `mostrarEstadoPilula` e tirar a chamada de `criarPilula`
(junto com o `showInactive()` logo depois); em `cartao.ts`, voltar `close()` para `hide()`. As opções
`skipTransformProcessType` e `setHiddenInMissionControl` podem ficar.
