# Auxiliar nativo do macOS (FalaAi)

Processo filho do Electron, escrito em Swift (`main.swift`). Faz o que o Electron não consegue:
atalhos globais configuráveis (CGEventTap ativo), colar texto no app em foco (Cmd+V simulado,
preservando a área de transferência), ler o contexto da tela pela Acessibilidade e silenciar o som.

**Especificação completa (fonte da verdade): `docs/design/PROTOCOLO_AUXILIAR.md`.** Abaixo, o resumo (versão 3).

## Protocolo v3 (resumo)

JSON UTF-8, uma mensagem por linha. stdin = comandos; stdout = respostas e eventos (logs vão para stderr).
Ao iniciar: `{"evento":"pronto","versao":3}`. EOF no stdin (ou `sair`) restaura pendências
(área de transferência, som) e encerra.

Todo comando tem `id` numérico e `cmd`; a resposta traz o mesmo `id`, `ok` e, em erro, `erro`.

| Comando | Resposta (além de id/ok) |
|---|---|
| `permissoes` (`pedir`) | `acessibilidade` |
| `iniciar_teclado` / `parar_teclado` | — (idempotentes; `iniciar` dá erro sem Acessibilidade) |
| `configurar_atalhos` (`atalhos:[{id,teclas[]}]`) | — (substitui a lista; erro claro se houver tecla desconhecida, duas teclas comuns etc.) |
| `capturar_atalho` | `teclas` (só responde quando a captura termina, até 10 s; uma por vez) |
| `cancelar_captura` | — (a captura em andamento responde `ok:false` "Captura cancelada.") |
| `colar` (`texto`) | — (área de transferência restaurada ~450 ms depois se ninguém mexeu) |
| `contexto` | `app`, `navegador`, `campo` (texto antes/depois do cursor, selecionado, placeholder; senha nunca é lida) |
| `ler_campo` | `texto` (até 20.000 caracteres, `null` se não der/senha), `appId` |
| `mutar_saida` | `jaEstavaMudo` |
| `desmutar_saida` | — (só desfaz se foi o auxiliar que silenciou) |
| `sair` | — |

Eventos (sem `id`): `atalho` (`id`, `estado` `desce`/`sobe`), `combinado` (outra tecla apertada com um atalho
só de modificadores, ex. Fn, seguro), `esc`. Sem atalhos configurados, só saem `esc`/`combinado`.

Regras dos atalhos (ver a especificação): modificadores com/sem lado (`Ctrl`, `CtrlLeft`...), Fn só pelo keycode 63;
atalho com tecla comum engole o keyDown/keyUp dessa tecla (o tap é ativo; todo o resto passa intacto).
Detalhe desta implementação: tecla comum **sozinha** (sem modificador) só é aceita para F1–F20; `A`, `Space`, `Esc` etc.
sem modificador dão `ok:false`, porque engoliriam a digitação normal.

## Novidades da v3

**Toque duplo** — `configurar_atalhos` aceita `["Duplo", X]` (X = uma tecla modificadora ou comum; "Duplo" só como
1º elemento, seguido de exatamente uma tecla; a regra "tecla comum sozinha só F1–F20" não vale com Duplo).
Toque = tecla descida ≤ 300 ms sem outra tecla no meio; o 2º desce vem ≤ 350 ms depois do 1º subir. Emite
`atalho desce` no 2º desce e `sobe` quando a tecla sobe. Auto-repetição não conta. Modificadores: nada é engolido.
Tecla comum: o 2º desce/sobe é engolido e, se a tecla digita (letras, números, Space, Tab), um Backspace
(kVK_Delete = 51) é injetado para apagar o caractere do 1º toque. Eventos injetados levam a marca
`eventSourceUserData = 0x46414C41` e são ignorados pelo tap. Um toque duplo só vale se nenhum outro modificador
estiver segurado (Shift é tolerado em tecla comum). Não usa timers: compara instantes (`DispatchTime`) no próprio callback.

**Captura de atalho** — `capturar_atalho` liga um modo em que nenhum atalho é emitido e as teclas comuns são
engolidas. Junta as teclas seguradas ao mesmo tempo (com lado: `CtrlLeft`, `OptionRight`...; ordem Fn, Ctrl, Option,
Cmd, Shift, tecla comum por último). Ao soltar tudo: se foi uma tecla só, espera 400 ms por um 2º toque
(`["Duplo", X]`), senão `[X]`; `Esc` sozinho = "Captura cancelada."; 10 s sem tecla = "Nenhuma tecla apertada.".
Requer o teclado ativo (senão "O teclado não está ativo (permissão de Acessibilidade)."); segunda captura simultânea =
"Já há uma captura em andamento."; `parar_teclado`/`sair` encerram a captura com erro. Detalhes desta implementação:
duas teclas comuns juntas dão erro "Só pode haver uma tecla comum no atalho."; teclas sem nome no protocolo
(setas, Backspace, pontuação) são engolidas e ignoradas na captura.

## Notas de implementação

- O callback do tap roda na main e só mexe em memória; as linhas de saída vão para uma fila serial própria.
- `contexto` e `ler_campo` rodam numa fila de background (orçamento ~0,3 s; timeout de 0,25 s por chamada AX),
  para nunca atrasar o teclado. A URL do navegador só é procurada em navegadores conhecidos (AXWebArea → AXURL).
- Mute usa CoreAudio no dispositivo de saída padrão (elemento principal ou canais 1 e 2).

## Compilar

```
scripts/compilar-auxiliar-mac.sh
```

Compila todos os `nativo/macos/*.swift` e gera `resources/bin/falaai-auxiliar-mac` (universal arm64 + x86_64, alvo macOS 12+).

## Permissões

Precisa de **Acessibilidade** (Ajustes do Sistema > Privacidade e Segurança > Acessibilidade) para
o teclado, simular Cmd+V e ler o contexto. A permissão vale para o app que hospeda o processo (o FalaAi, ou o
terminal durante testes).
