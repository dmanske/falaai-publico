# Módulo: Estatísticas (permanentes)

**Estado:** construído (17/10/2026). Testado com banco em memória; não testado no app aberto.

## O que faz

Os números do Início (palavras ditadas, tempo economizado, PPM, tempo total, dias ativos, sequências,
calendário de atividade e "Apps mais usados") vêm da tabela `estatisticas_dia`, não do histórico.
**Apagar ditados do histórico (um item, "Apagar tudo" ou limpeza por retenção) não diminui nenhum número.**
Não existe botão de zerar estatísticas.

## Tabela `estatisticas_dia`

| Coluna | Significado |
|---|---|
| `dia` | "AAAA-MM-DD" no fuso local (`date(criado_em, 'localtime')`) |
| `app` | nome do app (sem espaços nas pontas); `''` quando o ditado não tem app (aparece como "Outro") |
| `ditados` | quantidade de ditados com status `ok` |
| `palavras` | soma de palavras; no modo `pergunte` entra 0 (o texto é resposta da IA) |
| `duracao_ms` | soma da duração; no modo `pergunte` entra 0 |

Chave primária `(dia, app)`.

## Como é alimentada

- **Migração `estatisticas` v1** (roda depois da do histórico): cria a tabela e semeia uma vez com o que
  existe em `historico` (só `ok`, mesmas regras de `pergunte`). Quem já tinha ditados não perde nada.
- **`registrarDitado`**: depois do INSERT no histórico, se status `ok`, soma no dia/app (UPSERT). Falha nos
  totais só vai para o log; o ditado é salvo do mesmo jeito.
- **Reprocessar** (`historico/ipc.ts`): se o item já era `ok`, soma a diferença de palavras (novo - antigo)
  no dia/app dele; a duração não muda. Se era `erro` e virou `ok`, soma o ditado inteiro. Itens `pergunte`
  não mudam os totais.

## Onde fica

- `src/main/features/estatisticas/lib/totais.ts`: funções puras com `DatabaseSync` (`semearTotais`,
  `somarDitado`, `ajustarReprocessamento`, `lerResumo`) e `totais.test.ts`.
- `src/main/features/estatisticas/index.ts`: migração e `resumo()`.

## Diferenças conhecidas

- Ditados que o histórico já tinha perdido antes desta versão continuam perdidos (não há como recuperar).
- A tabela guarda o `app` como veio; a leitura junta `''` e um app literalmente chamado "Outro".
