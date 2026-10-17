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
| Compartilhado | `src/shared/` | `config.ts` (valores ajustáveis) e `ipc.ts` (contrato de canais e tipos) |
| Auxiliares nativos | `nativo/macos/` (Swift), `nativo/windows/` (Rust) | Teclado global, contexto do app em foco, colar texto. Rodam como processo separado e conversam em JSON |

**Segurança das janelas:** `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`,
CSP no HTML, links externos abrem no navegador.

## 3. Código: módulo novo sempre em pasta própria

Processo principal:

```
src/main/features/<modulo>/
├── index.ts        ← regras do módulo (funções exportadas)
├── ipc.ts          ← registro dos canais deste módulo
├── api/            ← chamadas a serviços externos (ex.: ia/api/lovable.ts)
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
- **Canal IPC novo:** nome e tipos em `src/shared/ipc.ts`, handler no `ipc.ts` do módulo, exposição
  no `src/preload/index.ts`. Nunca string de canal solta no código.
- **Valores ajustáveis** (modelos, tempos, nome do app): `src/shared/config.ts`.
- **Tipos** ficam no módulo; os de contrato entre processos, em `src/shared/ipc.ts`.
- **Chaves de API:** só via `features/chaves` (safeStorage). Nunca em `.env`, log ou na tela.
- **Saída para a internet:** só a IA (`features/ia/api/`). Nada de telemetria.
- Pastas vazias não são criadas. Comentários e mensagens em português.

## 4. Dados locais

Tudo em `app.getPath("userData")` (Mac: `~/Library/Application Support/FalaAi/`):

| Arquivo | Conteúdo |
|---|---|
| `chaves.json` | Chaves cifradas pelo sistema (base64) |
| `preferencias.json` | Modelo de IA, formato de áudio confirmado no teste |
| (fase 3) banco SQLite | Histórico, dicionário, estatísticas |

## 5. Documentação

| Momento | Pasta |
|---|---|
| Antes de construir algo grande | `docs/design/` |
| Pendência | `docs/planos/` |
| Correção não trivial feita | `docs/correcoes/` |
| Como funciona hoje | `docs/modulos/` |
| Funcionalidade nova | seção em `docs/produto/PRD.md` |

Análise pontual fica no chat. Documento velho vai para `docs/_arquivo/`, nunca é apagado.

## 6. Git

- Repositório privado `dmanske/newtypeless-oficial`. `main` é a versão estável.
- Mensagens de commit em português.
