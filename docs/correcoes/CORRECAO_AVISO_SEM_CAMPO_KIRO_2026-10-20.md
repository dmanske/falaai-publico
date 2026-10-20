# Correção: "Não achei um campo de texto aqui" em todo ditado no Kiro (20/10/2026)

**Pedido do Daniel:** "quando eu estou falando aqui no Kiro, aparece um texto como que não foi possível encontrar
algo de texto… mas ele acaba colando. Antes não era assim." Versão corrigida: 1.1.1.

## Causa

O aviso entrou na 1.1.0 (18/10/2026, item 7 da
[conferência do Typeless](../planos/CONFERENCIA_TYPELESS_2026-10-18.md)). Na mesma versão decidimos **nunca** ligar a
acessibilidade nos editores de código (`APPS_SEM_LIGAR_ACESSIBILIDADE`: VS Code, Kiro, Cursor, Windsurf, Orca), para
não ativar o "modo leitor de tela" deles. Sem a acessibilidade, o auxiliar não lê o campo em foco nesses apps, e
`deveAvisarCampoNaoEditavel` tratava "não consegui ler" como "não há campo": o aviso aparecia em todo ditado, mesmo
com o texto colando.

## Comparação com o Typeless 2.8.2

- **Mesma regra do aviso:** `DFvLNtQv.mjs`, funções `qo`/`dr`: `input_capabilities.is_editable` falso e o app fora
  das 4 listas (`fr`) → oferece copiar.
- **A diferença:** `setFocusedWindowEnhancedUserInterface` (`libContextHelper`, 0x678c, Ghidra) não exclui nenhum app;
  a única comparação de bundle id é com o próprio Typeless (`mainBundle.bundleIdentifier` ×
  `frontmostApplication.bundleIdentifier`). Ele liga a acessibilidade no Kiro e enxerga o campo; nós não.

## Correção

`src/main/features/ditado/lib/campoNaoEditavel.ts`: não avisar nos apps de `APPS_SEM_LIGAR_ACESSIBILIDADE`, pela mesma
razão do "acessibilidade acabou de ser ligada": nesses apps a leitura do campo não vale. Teste em
`campoNaoEditavel.test.ts` (Kiro sem campo e VS Code com campo não editável → sem aviso).

Efeito junto: no Kiro e no VS Code o dicionário volta a observar as correções depois de colar (estava desligado
quando o aviso aparecia), como era antes da 1.1.0.

## Verificação

`npm test` (209 passando), `npm run typecheck` e `npm run build` sem erros.

**Uso real (20/10/2026, versão 1.1.1):** 6 ditados no Kiro, todos colados (histórico), e segundo o Daniel o aviso não
apareceu mais. A linha `"editor.accessibilitySupport": "on"` continua fora do `settings.json` do Kiro.

## Como reverter

Tirar a linha `APPS_SEM_LIGAR_ACESSIBILIDADE` de `deveAvisarCampoNaoEditavel`.
