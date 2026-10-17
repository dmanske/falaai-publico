# Auxiliar nativo do macOS (FalaAi)

Processo filho do Electron, escrito em Swift (`main.swift`). Faz o que o Electron não consegue:
ler Fn/Esc/Ctrl+Cmd+V globalmente (CGEventTap, somente escuta) e colar texto no app em foco
(Cmd+V simulado, preservando a área de transferência).

## Protocolo

JSON UTF-8, uma mensagem por linha. stdin = comandos; stdout = respostas e eventos (logs vão para stderr).
Ao iniciar: `{"evento":"pronto","versao":1}`. EOF no stdin encerra o processo.

Comandos (todos com `id` numérico; a resposta traz o mesmo `id`, `ok` e, em erro, `erro`):

| Comando | Resposta |
|---|---|
| `{"id":1,"cmd":"permissoes","pedir":false}` | `{"id":1,"ok":true,"acessibilidade":bool}` (`pedir:true` abre o diálogo do sistema) |
| `{"id":2,"cmd":"iniciar_teclado"}` | `ok:true` (idempotente) ou erro se faltar Acessibilidade |
| `{"id":3,"cmd":"parar_teclado"}` | `ok:true` |
| `{"id":4,"cmd":"colar","texto":"..."}` | `ok:true` após postar o Cmd+V; a área de transferência é restaurada ~450 ms depois se ninguém mexeu |
| `{"id":5,"cmd":"sair"}` | `ok:true` e encerra |

Eventos (sem `id`, só com o teclado ativo): `{"evento":"fn","estado":"desce"|"sobe"}`,
`{"evento":"fn_combinado"}` (tecla pressionada com Fn segurada), `{"evento":"esc"}`,
`{"evento":"colar_ultima"}` (Ctrl+Cmd+V).

## Compilar

```
scripts/compilar-auxiliar-mac.sh
```

Gera `resources/bin/falaai-auxiliar-mac` (universal arm64 + x86_64, alvo macOS 12+).

## Permissões

Precisa de **Acessibilidade** (Ajustes do Sistema > Privacidade e Segurança > Acessibilidade) para
ler o teclado e simular Cmd+V. A permissão vale para o app que hospeda o processo (o FalaAi, ou o
terminal durante testes).
