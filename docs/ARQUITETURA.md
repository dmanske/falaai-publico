# Arquitetura e padrões do FalaAi

Adaptação do padrão dos projetos do Daniel (modelo: `netogofans/docs/ARQUITETURA.md`) para um
app desktop **local** em Electron. Não há Supabase nem edge functions neste projeto.

O Kiro lê o resumo disto em `.kiro/steering/arquitetura-projeto.md`.

## 1. Antes de começar qualquer coisa

1. **Explicar o plano e esperar aprovação** antes de mudança não trivial.
2. Ler o índice [`docs/README.md`](README.md), o design em `docs/design/` e o módulo em `docs/modulos/`.
3. Nunca mexer em áudio/sons do app sem pedido explícito.

## 2. Processos do Electron

| Processo | Pasta | O que faz |
|---|---|---|
| Principal (Node) | `src/main/` | Ciclo de vida, janelas, bandeja, chaves, IA, banco, auxiliar nativo |
| Ponte | `src/preload/` | Expõe `window.ponte` (só o que está no contrato) |
| Telas (React) | `src/renderer/` | Uma página HTML por janela |
| Compartilhado | `src/shared/` | `config.ts` (valores ajustáveis), `ipc/` (contrato de canais e tipos, um arquivo por domínio), `provedores.ts` (catálogo de IA e transcrição), `atalhos.ts`, `build.ts` e `temas/` (estilos da pílula, clubes e cores derivadas; funções puras com testes) |
| Auxiliares nativos | `nativo/macos/` (Swift), `nativo/windows/` (Rust) | Teclado global, contexto do app em foco, colar texto. Rodam como processo separado e conversam em JSON (protocolo em `design/PROTOCOLO_AUXILIAR.md`) |

**Segurança das janelas:** `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`,
CSP no HTML, links externos abrem no navegador.

## 3. Código: módulo novo sempre em pasta própria

Features do processo principal hoje: `chaves`, `dicionario`, `ditado`, `estatisticas`, `historico`, `ia`
(motor, prompts, `provedores/`, `ritmo/`), `nativo`, `permissoes`, `preferencias` e `sistema`. Janelas em
`src/main/janelas/` (hub, pílula, cartão, onboarding, configurações). Features das telas: `cartao`,
`configuracoes`, `dicionario`, `historico`, `hub`, `inicio`, `onboarding` e `pilula`.

Processo principal:

```
src/main/features/<modulo>/
├── index.ts        ← regras do módulo (funções exportadas)
├── ipc.ts          ← registro dos canais deste módulo
├── api/            ← chamadas a serviços externos (ex.: `ia/provedores/`)
├── types/index.ts  ← tipos DESTE módulo
└── lib/            ← utilitários do módulo (se houver)
```

Telas:

```
src/renderer/src/features/<modulo>/
├── index.ts        ← o que o módulo exporta
├── pages/          ← uma página por arquivo
├── components/
├── hooks/          ← um hook por responsabilidade
├── api/            ← único lugar que toca em window.ponte
└── types/          ← tipos do módulo (se houver)
```

Regras:
- **Canal IPC novo:** nome e tipos no arquivo do domínio em `src/shared/ipc/`, handler no `ipc.ts` do módulo, exposição
  no `src/preload/index.ts`. Nunca string de canal solta no código.
- **Valores ajustáveis** (modelos, tempos, nome do app): `src/shared/config.ts`.
- **Tipos** ficam no módulo; os de contrato entre processos, em `src/shared/ipc/`.
- **Chaves de API:** só via `features/chaves` (safeStorage). Nunca em `.env`, log ou na tela.
- **Saída para a internet:** só a IA e a transcrição escolhidas pelo usuário (`features/ia/provedores/`), a lista de modelos do OpenRouter e a consulta de atualizações no GitHub (`features/sistema/api/github.ts`). Nada de telemetria.
- Pastas vazias não são criadas. Comentários e mensagens em português.

## 4. Dados locais

Tudo em `app.getPath("userData")` (Mac: `~/Library/Application Support/FalaAi/`):

| Arquivo | Conteúdo |
|---|---|
| `chaves.json` | Chaves cifradas pelo sistema (base64) |
| `preferencias.json` | Provedor, modelos, atalhos, tema, estilo da pílula etc. |
| `falaai.db` | Banco SQLite (`node:sqlite`): histórico, dicionário, estatísticas |
| `audios/` | Áudios guardados dos ditados (preferência `guardarAudio`) |
| `openrouter-modelos.json` | Cache de 24 h da lista de modelos do OpenRouter |
| `janela-hub.json` | Tamanho da janela principal |

## 5. Documentação

| Momento | Pasta |
|---|---|
| Antes de construir algo grande | `docs/design/` |
| Pendência | `docs/planos/` |
| Correção não trivial feita | `docs/correcoes/` |
| Como funciona hoje | `docs/modulos/` |
| Funcionalidade nova | seção em `docs/produto/PRD.md` |

A pasta `docs/planos/` existe desde 18/10/2026. Análise pontual fica no chat. Documento velho vai para `docs/_arquivo/`, nunca é apagado.

## 6. Git

- Repositório privado `dmanske/falaai-oficial` (renomeado de `newtypeless-oficial` em 17/10/2026) e cópia pública `dmanske/falaai-publico` (mesmo código; é nela que o app procura atualizações, ver `REPO_ATUALIZACOES` em `src/shared/config.ts`). `main` é a versão estável.
- Mensagens de commit em português.
- **Versão nova** (`version` do `package.json`): acrescente no TOPO de `src/shared/novidades.ts` a entrada da versão,
  com a data e o que mudou em linguagem de quem usa. É o que aparece na página **Novidades** do app (e no aviso da
  pílula depois de atualizar). O teste `src/shared/novidades.test.ts` falha se a versão não tiver entrada.
  Cada versão ganha a tag `vX.Y.Z` no git.
