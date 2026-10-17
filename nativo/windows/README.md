# Auxiliar nativo do Windows

Programa em Rust (`falaai-auxiliar-win.exe`) que o FalaAi inicia como processo filho. Faz o que o app
Electron não consegue sozinho: **teclado global**, **colar texto**, **ler o contexto** (app e campo em
foco) e **silenciar o som**. Segue o protocolo v2, igual ao auxiliar do Mac:
[`docs/design/PROTOCOLO_AUXILIAR.md`](../../docs/design/PROTOCOLO_AUXILIAR.md).

## Compilar

No Windows (precisa do [Rust](https://rustup.rs)):

```
npm run nativo:win      # compila em release e copia para resources/bin/falaai-auxiliar-win.exe
```

No GitHub Actions isso roda sozinho (`.github/workflows/build.yml`). No Mac só dá para conferir o código:

```
rustup target add x86_64-pc-windows-msvc
cargo check --target x86_64-pc-windows-msvc   # a API do Windows, sem linkar
cargo test                                    # lógica pura (teclas, atalhos, protocolo)
```

## Organização

| Arquivo | O que faz | Roda no Mac (testes)? |
|---|---|---|
| `src/teclas.rs` | nomes de teclas -> códigos VK; `Option*`=`Alt*`, `Cmd*`=`Win*` | sim |
| `src/maquina.rs` | máquina de estados dos atalhos (desce/sobe/engolir/combinado/esc) | sim |
| `src/protocolo.rs` | comandos JSON, respostas, validação de atalhos | sim |
| `src/saida.rs` | escrita no stdout por thread própria (nunca bloqueia o teclado) | sim |
| `src/sistema/` | API do Windows: hook, área de transferência, UI Automation, som | só `cargo check` |

Threads: a **principal** roda o hook `WH_KEYBOARD_LL` e o loop de mensagens e é a única que mexe no
estado. Uma thread lê o stdin e acorda a principal com `PostThreadMessageW`. Consultas de UI Automation
rodam em threads de trabalho com prazo (contexto 300 ms; ler_campo 1,5 s). O programa é do subsistema
"windows": não abre janela de console.

## Decisões e limites

**Atalhos.** Mesmas regras do Mac. Modificadores nunca são engolidos; a tecla comum de um atalho é
engolida (retorna 1 no hook) e o "sobe" dela também. Auto-repetição não gera novo `desce` (o hook do
Windows não informa repetição; a máquina detecta pela tecla já estar pressionada).

**AltGr.** Em teclados como o ABNT2, o Alt direito é AltGr e o Windows envia antes um Ctrl esquerdo
"falso" (scan code `0x21D`). Esse Ctrl é ignorado (`ctrl_falso_altgr`), senão `["AltRight"]` nunca teria
"modificadores exatos". Consequência: AltGr+tecla (acentos, `@`, etc.) ainda funciona normalmente, mas
o ditado em `AltRight` dispara também quando o usuário usa o AltGr para digitar um símbolo. Se atrapalhar,
troque o atalho nas configurações.

**Menu do Alt.** No Windows, apertar e soltar Alt sozinho ativa a barra de menu do app em foco (e o Win
abre o menu Iniciar). Quando um atalho que usa Alt/Win foi acionado, antes de liberar a tecla o auxiliar
injeta uma tecla "neutra" (`VK 0xE8`, não atribuída) — o Windows entende que o Alt foi usado numa
combinação e não abre o menu. Todas as teclas injetadas levam a marca `dwExtraInfo = 0x46414C41` e o hook
as ignora.

**Colar.** Guarda os formatos da área de transferência que são memória comum (texto, HTML, RTF, imagens
DIB/PNG, lista de arquivos `CF_HDROP`, formatos registrados), grava o texto em `CF_UNICODETEXT` (fim de
linha convertido para CRLF), solta os modificadores que ainda estão pressionados (Alt/Win com a tecla
neutra antes) e envia Ctrl+V com `SendInput`. Depois de ~450 ms restaura, **só se** o
`GetClipboardSequenceNumber` não mudou. Colagens seguidas preservam o original do usuário. O texto
temporário é marcado para não entrar no histórico do Windows (Win+V) nem na nuvem.
*Limites:* formatos que são alças do sistema (bitmap, paleta, metafile — o Windows regenera a partir do DIB)
e de uso privado não são preservados; cada formato tem teto de 64 MB (192 MB no total); copiar formatos de
renderização atrasada pode demorar em apps que os geram sob demanda. O Ctrl+V usa só o código de tecla
virtual (sem scan code), o que alguns programas de tela remota/jogos podem ignorar.

**Contexto e campo (UI Automation).** `app`: título da janela em foco + exe (`appId` = `slack.exe`,
`nome` = `slack`). Apps da Microsoft Store aparecem como `ApplicationFrameHost.exe`. `campo`: elemento em
foco do UI Automation; papel (`Edit`, `Document`, `ComboBox`…), texto antes (800)/depois (300) do cursor e
selecionado via `TextPattern`; sem ele, `ValuePattern` (valor inteiro conta como "antes", sem posição
do cursor). `placeholder` = texto de ajuda do campo ou, na falta, o nome (rótulo) — o Windows não tem
atributo de placeholder. Senha (`IsPassword`) nunca lê valor. O que falhar vira `null`/vazio. Navegadores
só expõem o conteúdo de páginas se a acessibilidade deles estiver ativa.
**`navegador` é sempre `null`** (a URL via UI Automation não foi implementada).

**Som.** `IAudioEndpointVolume::SetMute` no dispositivo de saída padrão (`eRender`/`eConsole`). Só desfaz
se foi o auxiliar que silenciou; sair/EOF também desfaz.

**Permissões.** O Windows não pede permissão: `permissoes` sempre responde `acessibilidade: true`.
Um app em foco rodando como administrador não recebe teclas/colagem de um auxiliar sem privilégio
(limitação do Windows/UIPI).

## Não verificado em Windows real

Tudo o que depende do sistema foi só **compilado** (`cargo check`), nunca executado: hook de teclado,
neutralização do menu, colar/restaurar, UI Automation, som, ausência de janela de console, comportamento
do AltGr no ABNT2. A lógica pura tem testes (`cargo test`).
