# Auxiliar nativo do macOS (FalaAi)

Processo filho do Electron, escrito em Swift (`main.swift`). Faz o que o Electron não consegue:
atalhos globais configuráveis (CGEventTap ativo), colar texto no app em foco (Cmd+V simulado,
preservando a área de transferência), ler o contexto da tela pela Acessibilidade e silenciar o som.

**Especificação completa (fonte da verdade): `docs/design/PROTOCOLO_AUXILIAR.md`.** Abaixo, o resumo da versão 2.

## Protocolo v2 (resumo)

JSON UTF-8, uma mensagem por linha. stdin = comandos; stdout = respostas e eventos (logs vão para stderr).
Ao iniciar: `{"evento":"pronto","versao":2}`. EOF no stdin (ou `sair`) restaura pendências
(área de transferência, som) e encerra.

Todo comando tem `id` numérico e `cmd`; a resposta traz o mesmo `id`, `ok` e, em erro, `erro`.

| Comando | Resposta (além de id/ok) |
|---|---|
| `permissoes` (`pedir`) | `acessibilidade` |
| `iniciar_teclado` / `parar_teclado` | — (idempotentes; `iniciar` dá erro sem Acessibilidade) |
| `configurar_atalhos` (`atalhos:[{id,teclas[]}]`) | — (substitui a lista; erro claro se houver tecla desconhecida, duas teclas comuns etc.) |
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
