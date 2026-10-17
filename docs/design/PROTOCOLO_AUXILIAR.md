# Protocolo do auxiliar nativo — versão 3

Contrato entre o app (Electron, `src/main/features/nativo/`) e o auxiliar nativo (Mac:
`nativo/macos/main.swift`; Windows: `nativo/windows/`, na F5). Os dois lados seguem **exatamente** isto.

Transporte: JSON, uma mensagem por linha, UTF-8. stdin = comandos do app; stdout = respostas e eventos
(nada além de JSON no stdout; logs vão para o stderr). Fechou o stdin (EOF) → o auxiliar restaura o que
estiver pendente (área de transferência, som) e encerra.

Ao iniciar: `{"evento":"pronto","versao":3}`

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
| `colar` | `texto` | — | como na v1 (guarda e restaura a área de transferência; colagens seguidas preservam o original do usuário) |
| `contexto` | — | `app`, `navegador`, `campo` (ver abaixo) | no máximo ~300 ms; o que não der para ler vem `null` |
| `ler_campo` | — | `texto: string \| null`, `appId: string \| null` | valor inteiro do campo em foco (até 20.000 caracteres); para aprender correções |
| `mutar_saida` | — | `jaEstavaMudo: bool` | silencia a saída de som padrão |
| `desmutar_saida` | — | — | só desfaz se foi o `mutar_saida` que silenciou |
| `capturar_atalho` | — | `teclas: string[]` | ver "Captura de atalho"; responde só quando a captura termina (até 10 s) |
| `cancelar_captura` | — | — | encerra uma captura em andamento (a resposta dela vem com `ok:false`, erro "Captura cancelada.") |
| `apertar_enter` | — | — | v3.1: aperta Enter no app em foco (envio automático depois de colar); evento marcado, o detector de atalhos o ignora |
| `sair` | — | — | restaura pendências e encerra |

### Resposta de `contexto`

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
    "selecionado": "texto selecionado ou vazio"
  }
}
```

- `app` sempre vem (o app em foco). `navegador` só quando o app é um navegador e deu para ler a URL
  pela Acessibilidade (AXWebArea → AXURL); senão `null`. `campo` é `null` quando não há campo de texto
  em foco ou o app não expõe a Acessibilidade.
- Senhas (`AXSecureTextField`): `campo` vem com `papel` e todo o resto vazio. Nunca ler texto de senha.

## Eventos (sem `id`)

| evento | Campos | Quando |
|---|---|---|
| `pronto` | `versao: 3` | ao iniciar |
| `atalho` | `id`, `estado: "desce" \| "sobe"` | um atalho configurado foi pressionado / solto |
| `combinado` | — | outra tecla foi apertada enquanto um atalho **só de modificadores** (ex.: Fn) estava seguro: era um atalho do sistema (Fn+Delete), não ditado |
| `esc` | — | Esc pressionado (sem auto-repetição) |

## Atalhos

`teclas`: nomes de `src/shared/atalhos.ts`. Modificadores: `Fn`, `Ctrl`/`CtrlLeft`/`CtrlRight`,
`Option`/`OptionLeft`/`OptionRight`, `Cmd`/`CmdLeft`/`CmdRight`, `Shift`/`ShiftLeft`/`ShiftRight`
(sem lado = qualquer lado). No máximo uma tecla comum: `Space`, `A`–`Z`, `0`–`9`, `F1`–`F20`, `Enter`,
`Tab`, `Esc`. Prefixo `Duplo` = toque duplo (v3, ver abaixo). Tecla comum sozinha (sem modificador)
só vale para F1–F20 ou com `Duplo`.

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
