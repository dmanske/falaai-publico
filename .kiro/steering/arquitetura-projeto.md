---
inclusion: always
---

# FalaAi — regras de arquitetura (resumo)

Documento completo: `docs/ARQUITETURA.md`. Índice: `docs/README.md`.

- App desktop **local** em Electron (Mac e Windows). Sem servidor, sem Supabase, sem telemetria.
- IA só pela chave da Lovable do usuário, em `src/main/features/ia/api/lovable.ts`.
- Explicar o plano e esperar aprovação antes de mudança não trivial.
- Módulo novo em pasta própria: `src/main/features/<modulo>/` (index, ipc, api, types) e
  `src/renderer/src/features/<modulo>/` (index, pages, components, hooks, api, types).
- Canais IPC e seus tipos só em `src/shared/ipc.ts`; valores ajustáveis em `src/shared/config.ts`.
- Chaves só via `features/chaves` (safeStorage). Nunca em `.env`, log ou na tela.
- Janelas com `contextIsolation`, `sandbox` e sem `nodeIntegration`.
- Não mexer em sons/áudio do app sem pedido explícito.
- Comentários, textos e commits em português.
- Subiu a versão no `package.json`? Acrescente no topo de `src/shared/novidades.ts` a data e o que mudou (página
  Novidades do app); o teste `novidades.test.ts` falha se faltar. Tag `vX.Y.Z` no git.
