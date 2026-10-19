# Protocolo do auxiliar nativo — versão 4

Contrato entre o app (Electron, `src/main/features/nativo/`) e o auxiliar nativo (Mac:
`nativo/macos/main.swift`; Windows: `nativo/windows/`, na F5). Os dois lados seguem **exatamente** isto.

Transporte: JSON, uma mensagem por linha, UTF-8. stdin = comandos do app; stdout = respostas e eventos
(nada além de JSON no stdout; logs vão para o stderr). Fechou o stdin (EOF) → o auxiliar restaura o que
estiver pendente (área de transferência, som) e encerra.

Ao iniciar: `{"evento":"pronto","versao":4}`

**v4 (18/10/2026):** (motivos em `docs/planos/CONFERENCIA_TYPELESS_2026-10-18.md`) tudo da v3 continua igual;
todo campo novo é opcional e, ausente, reproduz a v3.
- `colar` aceita `html` (o mesmo item da área de transferência leva texto + html) e grava com
  `.currentHostOnly` (o ditado não vai pela Área de Transferência Universal); a tecla do V vem do layout atual.
- Comando novo `copiar_selecao` (copia a seleção com Cmd+C e devolve a área de transferência).
- `contexto` ampliado: `pid` e `extras` no pedido; `campo.editavel`, `campo.leitura`, `conversa`, `tela` e
  `acessibilidadeLigada` na resposta; leitura por marcadores de texto (campos web) e opção de ligar a
  acessibilidade de apps Electron/Chromium.
- Comandos novos `dispositivos_audio` e `teclados`.
- Botões do mouse como atalho: `Mouse3`, `Mouse4`, `Mouse5`.
- O Windows ainda é v3: responde "Comando desconhecido" para os comandos novos e ignora os campos novos.

**v3 (17/10/2026):** toque duplo (`"Duplo"`) e captura de atalho (`capturar_atalho`). Tudo da v2 continua
igual.

## Comandos

Todo comando tem `id` (número) e `cmd`. A resposta sempre traz o mesmo `id` e `ok` (bool); em erro,
`ok:false` + `erro` (texto em português).

| cmd | Campos | Resposta (além de id/ok) | Notas |
|---|---|---|---|
| `permissoes` | `pedir: bool` | `acessibilidade: bool` | como na v1 |
| `iniciar_teclado` | — | — | tap do teclado; `ok:false` sem permissão; idempotente |
| `parar_teclado` | — | — | |
| `configurar_atalhos` | `atalhos: [{id, teclas: string[]}]` | — | substitui a lista inteira; ver "Atalhos" |
| `colar` | `texto`, `html?` | — | guarda e restaura a área de transferência (~450 ms depois, se ninguém mexeu); colagens seguidas preservam o original do usuário; ver "Colar (v4)" |
| `contexto` | `pid?`, `extras?` | `app`, `navegador`, `campo`, `conversa`, `tela`, `acessibilidadeLigada` (ver abaixo) | ~300 ms para campo/janela/URL; `conversa` e `tela` têm prazo próprio de 0,5 s; o que não der para ler vem `null` |
| `ler_campo` | — | `texto: string \| null`, `appId: string \| null` | valor inteiro do campo em foco (até 20.000 caracteres); para aprender correções |
| `copiar_selecao` | `prazoMs?` | `texto: string \| null` | v4: ver "Copiar a seleção" |
| `dispositivos_audio` | — | `entradas[]`, `tampaFechada: bool \| null` | v4: ver "Dispositivos e teclados" |
| `teclados` | — | `teclados[]` | v4: idem |
| `mutar_saida` | — | `jaEstavaMudo: bool` | silencia a saída de som padrão |
| `desmutar_saida` | — | — | só desfaz se foi o `mutar_saida` que silenciou |
| `capturar_atalho` | — | `teclas: string[]` | ver "Captura de atalho"; responde só quando a captura termina (até 10 s) |
| `cancelar_captura` | — | — | encerra uma captura em andamento (a resposta dela vem com `ok:false`, erro "Captura cancelada.") |
| `apertar_enter` | — | — | v3.1: aperta Enter no app em foco (envio automático depois de colar); evento marcado, o detector de atalhos o ignora |
| `sair` | — | — | restaura pendências e encerra |

### Resposta de `contexto` (v4)

```json
{
  "id": 7, "ok": true,
  "app": { "nome": "Slack", "appId": "com.tinyspeck.slackmacgap", "janela": "Geral | Manske" },
  "navegador": { "url": "https://mail.google.com/...", "titulo": "Caixa de entrada" },
  "campo": {
    "papel": "AXTextArea",
    "placeholder": "Mensagem para #geral",
    "antes": "…até 800 caracteres antes do cursor…",
    "depois": "…até 300 caracteres depois…",
    "selecionado": "texto selecionado ou vazio",
    "editavel": true,
    "leitura": "valor"
  },
  "conversa": { "antes": "…mensagens acima do campo…", "depois": "" },
  "tela": "…texto visível da janela…",
  "acessibilidadeLigada": false
}
```

Pedido: `{"id":7,"cmd":"contexto","pid":123,"extras":{"antes":800,"depois":300,"conversa":0,"tela":0,"ligarAcessibilidade":false,"naoLigarEm":["com.microsoft.VSCode"]}}`

- `extras` é opcional (ausente = v3: `antes` 800, `depois` 300, sem conversa nem tela, sem ligar nada). `antes`/`depois` =
  máximo de caracteres ao redor do cursor; `conversa`/`tela` = máximo de caracteres (0 = não ler). Todos limitados a 20.000.
- `pid` é opcional e serve para diagnóstico/testes: lê esse app em vez do app da frente. O elemento em foco vem só de
  `AXUIElementCreateApplication(pid)` (o systemWide é do app da frente).

- `app` sempre vem (o app em foco; `null` só se o `pid` não existe). `navegador` só quando o app é um navegador e deu para ler a URL
  pela Acessibilidade (AXWebArea → AXURL); senão `null`. `campo` é `null` quando não há campo de texto
  em foco ou o app não expõe a Acessibilidade.
- Senhas (`AXSecureTextField`): `campo` vem com `papel`, `editavel:true`, `leitura:"nenhuma"` e todo o resto vazio. Nunca ler
  texto de senha (nem na `conversa` nem na `tela`).
- `campo.editavel`: papel `AXTextField`, `AXTextArea`, `AXComboBox` ou `AXSearchField`, OU o `AXValue` do elemento é gravável.
- `campo.leitura`: de onde veio o texto antes/depois: `"valor"` (AXValue + AXSelectedTextRange), `"marcador"` ou `"nenhuma"`.
- `acessibilidadeLigada`: `true` se ESTA chamada ligou a acessibilidade do app (ver abaixo).

#### Texto por marcador (campos web: Gmail, Notion, ChatGPT)

Se o campo é de texto mas o `AXValue` é nil ou não há `AXSelectedTextRange`, o auxiliar tenta `AXSelectedTextMarkerRange`:
pega o intervalo do documento (`AXTextMarkerRangeForUIElement`, parâmetro = o próprio elemento), monta
[início do documento, início da seleção] e [fim da seleção, fim do documento] com `AXTextMarkerRangeCreate` e lê cada um
com `AXStringForTextMarkerRange`. `antes` = últimos `antes` caracteres, `depois` = primeiros `depois`, `selecionado` =
texto do intervalo selecionado (até 20.000). Recortes nunca partem pares substitutos. `leitura:"marcador"`. Qualquer
falha segue como na v3. `ler_campo` usa o mesmo caminho quando o `AXValue` vem nil (texto inteiro, até 20.000).

#### Ligar a acessibilidade (só com `ligarAcessibilidade:true` e `appId` fora de `naoLigarEm`)

Uma vez por pid (o auxiliar guarda os pids já tratados).
- App Electron (existe `Contents/Frameworks/Electron Framework.framework`): `AXManualAccessibility = true` antes de ler o campo.
- Navegador Chromium (Chrome, Chromium, Edge, Brave, Arc/`company.thebrowser.*`, Vivaldi, Opera, Atlas, Comet): só se o campo
  NÃO pôde ser lido, `AXEnhancedUserInterface = true`.
- Se ligou agora: espera ~100 ms e tenta ler o campo mais uma vez (o prazo do campo/janela/URL pode ir a 0,5 s só nesse
  caso) e responde `acessibilidadeLigada:true`.

#### Conversa (`conversa > 0`; porte do Typeless)

Só se o papel do campo é `AXTextArea` e o pai dele é um `AXScrollArea` com exatamente 1 filho (o campo); senão `conversa:null`.
O recipiente é esse pai; continua subindo enquanto o pai for `AXGroup`/`AXSplitGroup` com 1 filho só. `antes` = texto dos
irmãos ANTERIORES do recipiente (do mais próximo ao mais longe; se não bastar, sobe um nível e repete, no máximo 10 níveis, sem
passar de `AXWindow`), guardando os últimos `conversa` caracteres; `depois` = o mesmo com os irmãos POSTERIORES, guardando o
começo. Prazo próprio de 0,5 s e no máximo 400 elementos.

#### Texto da janela (`tela > 0`)

Busca em profundidade a partir da janela em foco (em navegador, a partir do `AXWebArea` da URL). Profundidade máxima 50, até
1.500 elementos, prazo próprio de 0,5 s. Lê `AXStaticText`, `AXTextField`, `AXTextArea`, `AXSearchField` e `AXComboBox`
(valor; se vazio, título), nunca `AXSecureTextField`, e pula o próprio campo em foco. Entre `AXStaticText` seguidos vai um
espaço; entre os demais, quebra de linha. Corta em `tela` caracteres. `null` se nada foi lido.

## Colar (v4)

`{"id":n,"cmd":"colar","texto":"…","html":"<b>…</b>"}`. Um único item da área de transferência leva `.string`, `.html`
(se `html` vier) e `org.nspasteboard.TransientType`. A gravação (e a restauração do original, ~450 ms depois, só se o
`changeCount` não mudou) usa `prepareForNewContents(with: .currentHostOnly)`: nada vai pela Área de Transferência
Universal. O Cmd+V usa o keycode que o layout de teclado ATUAL dá ao "v" **com Command segurado** (`UCKeyTranslate`
com o estado do Cmd: em "Dvorak - QWERTY ⌘" o Cmd usa a posição QWERTY); sem layout Unicode, o ANSI (9). Conferido
em 18/10/2026 no layout Brasileiro: V = 9 e C = 8, os mesmos de antes.

## Copiar a seleção (v4)

`{"id":n,"cmd":"copiar_selecao","prazoMs":300}` → `{"id":n,"ok":true,"texto":string|null}`. Para o modo "pergunte"
quando a Acessibilidade não deu a seleção. `prazoMs` opcional: padrão 300, mínimo 50, máximo 1000.
1. Sem Acessibilidade: `ok:false`, "Sem permissão de Acessibilidade para copiar a seleção.".
2. Restaura uma colagem pendente, guarda a área de transferência inteira, limpa (`.currentHostOnly`) e anota o `changeCount`.
3. Posta Cmd+C (marcado: o detector de atalhos o ignora) e olha a cada 15 ms se o `changeCount` mudou (sem bloquear o auxiliar).
4. Lê o texto e devolve a área do usuário, **só se** ninguém mexeu nela depois (se o usuário copiou outra coisa no meio, não
   restaura). Texto vazio ou só espaços → `texto:null`.
Só uma cópia por vez: outra `copiar_selecao` durante a primeira → `ok:false`, "Já há uma cópia em andamento.". Um `colar`
(ou `sair`) durante a cópia a encerra primeiro (restaura e responde `texto:null`).

## Dispositivos e teclados (v4)

`dispositivos_audio` → `{"ok":true,"entradas":[{"nome":"MacBook Pro Microphone","uid":"…","transporte":"embutido","padrao":true,"vivo":true}],"tampaFechada":false}`.
Só dispositivos com fluxos de entrada. `transporte`: `embutido`, `bluetooth`, `usb`, `airplay`, `thunderbolt`, `virtual`,
`pci`, `firewire`, `hdmi`, `displayport`, `agregado`, `iphone` (Continuidade, `ccwd`/`ccwl`) ou `desconhecido`.
`padrao` = é a entrada padrão; `vivo` = o
dispositivo responde. `tampaFechada` vem de `AppleClamshellState` (IOKit); `null` em Mac sem tampa.

`teclados` → `{"ok":true,"teclados":[{"nome":"Apple Internal Keyboard / Trackpad","embutido":true}]}` (IOHIDManager,
Genérico/Teclado). `embutido` = `Built-In` ou transporte FIFO/SPI. Ignora nomes vazios e "Karabiner"; sem duplicados.
Só lista (não abre o gerente nem pede "Monitoramento de entrada").

## Eventos (sem `id`)

| evento | Campos | Quando |
|---|---|---|
| `pronto` | `versao: 4` | ao iniciar |
| `atalho` | `id`, `estado: "desce" \| "sobe"` | um atalho configurado foi pressionado / solto |
| `combinado` | — | outra tecla foi apertada enquanto um atalho **só de modificadores** (ex.: Fn) estava seguro: era um atalho do sistema (Fn+Delete), não ditado |
| `esc` | — | Esc pressionado (sem auto-repetição) |

## Atalhos

`teclas`: nomes de `src/shared/atalhos.ts`. Modificadores: `Fn`, `Ctrl`/`CtrlLeft`/`CtrlRight`,
`Option`/`OptionLeft`/`OptionRight`, `Cmd`/`CmdLeft`/`CmdRight`, `Shift`/`ShiftLeft`/`ShiftRight`
(sem lado = qualquer lado). No máximo uma tecla comum: `Space`, `A`–`Z`, `0`–`9`, `F1`–`F20`, `Enter`,
`Tab`, `Esc`, e (v4) os botões do mouse `Mouse3` (meio), `Mouse4`, `Mouse5`. Prefixo `Duplo` = toque duplo (v3, ver abaixo). Tecla comum sozinha (sem modificador)
só vale para F1–F20, botões do mouse ou com `Duplo`.

Regras:
- **Atalho só de modificadores** (ex.: `["Fn"]`, `["Fn","ShiftLeft"]`): `desce` quando o conjunto de
  modificadores seguros passa a **conter** os do atalho, sem nenhum modificador a mais; `sobe` quando
  algum deles é solto. Ex.: segurando Fn → `ditado desce`; apertando Shift esq. junto → `traducao desce`
  (o `ditado` continua "descido" até o Fn subir).
- **Atalho com tecla comum** (ex.: `["Fn","Space"]`, `["Ctrl","Cmd","V"]`): `desce` no keyDown da tecla
  com exatamente aqueles modificadores; `sobe` no keyUp dela ou quando um dos modificadores é solto.
  **O evento da tecla comum é engolido** (não chega ao app), senão o Espaço digitaria um espaço. Os
  modificadores nunca são engolidos.
- Auto-repetição não gera novo `desce`.
- O tap do teclado é ativo (não só leitura), para poder engolir as teclas comuns dos atalhos; todo o
  resto passa intacto. Se o sistema desligar o tap (timeout), religar.

## Toque duplo (v3)

Atalho `["Duplo", X]`: tocar a tecla `X` duas vezes rápido. `X` é **uma** tecla, modificadora (`Fn`,
`OptionRight`, `CmdRight`, `Shift`…) ou comum (`A`, `R`, `F5`, `Space`…).

- **Toque** = a tecla desce e sobe sem nenhuma outra tecla no meio, e fica descida no máximo 300 ms.
- **Duplo**: o segundo "desce" da mesma tecla acontece até **350 ms** depois de o primeiro toque subir,
  sem outra tecla no meio. Nesse segundo desce emite `{"evento":"atalho","id":…,"estado":"desce"}`; quando
  essa tecla sobe, emite `sobe`. (O app decide: soltou rápido = mãos livres; segurou = grava enquanto
  segura.)
- Auto-repetição não conta como toque.
- **Tecla comum** (letra, número, Espaço…): o primeiro toque passa normalmente (já digitou o caractere).
  No segundo desce, o auxiliar **engole** o segundo desce/sobe e **apaga o caractere do primeiro toque**
  enviando um Backspace (só para teclas que digitam algo: letras, números, Espaço, Tab; nunca para F1–F20).
  Eventos que o próprio auxiliar injeta são marcados e ignorados pelo detector.
- **Tecla modificadora**: nada é engolido nem apagado.
- Um atalho `Duplo` não interfere nos atalhos segurados: `["Fn"]` (segurar) e `["Duplo","Fn"]` podem
  coexistir; com os dois configurados, o primeiro toque de Fn ainda emite `ditado desce/sobe` (o app vê um
  toque rápido = mãos livres) — por isso a tela não deixa configurar os dois para a mesma tecla.

## Captura de atalho (v3)

`capturar_atalho` liga um modo em que o auxiliar **não emite eventos de atalho** e **engole as teclas
comuns** (para nada ser digitado nem disparar), e devolve o que o usuário apertou:

1. Junta todas as teclas seguradas ao mesmo tempo (modificadores + no máximo uma tecla comum), com lado
   (`ShiftLeft`, `OptionRight`…) e `Fn`.
2. Quando todas são soltas: se foi **uma tecla só**, espera até 400 ms por um segundo toque da mesma tecla:
   se vier, responde `["Duplo", X]` (depois que ela subir); senão responde `[X]`. Se foram várias,
   responde a combinação (modificadores primeiro, na ordem Fn, Ctrl, Option, Cmd, Shift; a tecla comum por
   último).
3. Sem nenhuma tecla em 10 s → `ok:false`, erro "Nenhuma tecla apertada.". `Esc` sozinho (sem toque duplo)
   → `ok:false`, erro "Captura cancelada.".
4. Ao terminar (qualquer caso), volta ao normal com os atalhos configurados.

A captura não valida se o atalho é bom (ex.: uma letra sozinha) — quem valida é a tela
(`validarAtalho` em `src/shared/atalhos.ts`).

## Silenciar o som (`mutar_saida`)

Dispositivo de saída padrão (CoreAudio: `kAudioHardwarePropertyDefaultOutputDevice` →
`kAudioDevicePropertyMute`, escopo de saída). Se o dispositivo não suportar mute, `ok:false` com
"Este dispositivo de som não pode ser silenciado.".

## Botões do mouse como atalho (v4)

`Mouse3` (botão do meio, buttonNumber 2), `Mouse4` (3) e `Mouse5` (4) valem em `configurar_atalhos`, no toque duplo
(`["Duplo","Mouse4"]`) e na captura. Sozinhos (sem modificador) são aceitos, como as F1–F20. Os botões esquerdo e direito nunca
entram. O tap também escuta `otherMouseDown`/`otherMouseUp`: na captura o botão é tratado como tecla (e engolido); fora dela, se
algum atalho usa aquele botão ele se comporta como a tecla comum (casa com os modificadores exatos, é engolido quando casa,
emite `desce`/`sobe`, alimenta o toque duplo); se nenhum atalho o usa, passa intacto e NÃO conta como "outra tecla" (não emite
`combinado` nem reinicia o toque duplo).
