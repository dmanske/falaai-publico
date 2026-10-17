# Protocolo do auxiliar nativo — versão 2

Contrato entre o app (Electron, `src/main/features/nativo/`) e o auxiliar nativo (Mac:
`nativo/macos/main.swift`; Windows: `nativo/windows/`, na F5). Os dois lados seguem **exatamente** isto.

Transporte: JSON, uma mensagem por linha, UTF-8. stdin = comandos do app; stdout = respostas e eventos
(nada além de JSON no stdout; logs vão para o stderr). Fechou o stdin (EOF) → o auxiliar restaura o que
estiver pendente (área de transferência, som) e encerra.

Ao iniciar: `{"evento":"pronto","versao":2}`

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
| `pronto` | `versao: 2` | ao iniciar |
| `atalho` | `id`, `estado: "desce" \| "sobe"` | um atalho configurado foi pressionado / solto |
| `combinado` | — | outra tecla foi apertada enquanto um atalho **só de modificadores** (ex.: Fn) estava seguro: era um atalho do sistema (Fn+Delete), não ditado |
| `esc` | — | Esc pressionado (sem auto-repetição) |

## Atalhos

`teclas`: nomes de `src/shared/atalhos.ts`. Modificadores: `Fn`, `Ctrl`/`CtrlLeft`/`CtrlRight`,
`Option`/`OptionLeft`/`OptionRight`, `Cmd`/`CmdLeft`/`CmdRight`, `Shift`/`ShiftLeft`/`ShiftRight`
(sem lado = qualquer lado). No máximo uma tecla comum: `Space`, `A`–`Z`, `0`–`9`, `F1`–`F20`, `Enter`,
`Tab`, `Esc`.

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

## Silenciar o som (`mutar_saida`)

Dispositivo de saída padrão (CoreAudio: `kAudioHardwarePropertyDefaultOutputDevice` →
`kAudioDevicePropertyMute`, escopo de saída). Se o dispositivo não suportar mute, `ok:false` com
"Este dispositivo de som não pode ser silenciado.".
