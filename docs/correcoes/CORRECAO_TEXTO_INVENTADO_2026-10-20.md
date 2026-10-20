# Correção: a IA inventava ou completava o texto ditado (20/10/2026)

**Pedido do Daniel:** "às vezes eles inventam umas palavras do que a gente fala, completa automaticamente no prompt".
Versão corrigida: 1.1.1.

## Evidência

Histórico local (`falaai.db`, tabela `historico`, 150 ditados desde 19/10), palavras ÷ duração do áudio:

| Ditados | Palavras por segundo |
|---|---|
| 149 | de 1 a 4 |
| 1 (20/10 03:26, Kiro) | **46**: 39 palavras em **0,84 s** de áudio |

Texto colado: "Dá uma olhada no log do Supabase porque eu acho que o erro de silêncio no DuoMac é por causa do timeout da
função. Tenta aumentar para 60 segundos e faz o deploy de novo para a gente testar." Três minutos depois o Daniel
ditou "Não, isso aí saiu errado no texto… Pode ignorar totalmente isso aí do Supabase."

## Causa

- O Daniel usa a Lovable com o Gemini 3 Flash: o mesmo modelo ouve o áudio e recebe o contexto numa chamada só. Com
  "Ler a conversa e o texto da janela" ligado, o contexto tem até 10.000 caracteres da janela. Com quase nada de
  fala no áudio, o modelo escrevia uma mensagem que combinava com a tela em vez de devolver `<vazio>`. Não deu para
  provar que a frase veio da tela: o contexto não fica salvo e o áudio não estava guardado.
- No Kiro a janela inteira estava exposta porque o Kiro estava no modo "Screen Reader Optimized"
  (`"editor.accessibilitySupport": "on"` no `settings.json` dele, gravado em 07/10/2026 às 01:39, antes do FalaAi
  existir). A linha foi removida em 20/10/2026 com o ok do Daniel.
- O bloco de contexto do prompt dizia "Se o texto antes do cursor termina no meio de uma frase, **continue a
  frase**", um convite para completar.
- Antes da IA, o único filtro era a duração mínima de 0,4 s (`GRAVACAO_MINIMA_MS`). O app já media quanto do áudio
  é fala (`analisarRitmo` → `falaS`), mas não usava isso para barrar.

**Typeless 2.8.2:** também manda o texto da tela (`visible_screen_content`). A decisão de "sem fala" é do servidor
dele (o app só recebe `RECOVERABLE_NO_SPEECH_DETECTED`, `DFvLNtQv.mjs`); o prompt fica no servidor e não dá para
comparar.

## Correção

| Trava | Onde | Valor (`src/shared/config.ts`) |
|---|---|---|
| Antes da IA: menos de 0,2 s de fala medida → nem chama a IA, "Não entendi nenhuma fala." | `ia/ritmo/index.ts` (`poucaFala`), `ia/modos.ts` | `FALA_MINIMA_IA_S` = 0,2 |
| Depois da IA: mais palavras do que dá para falar → não cola nem guarda, "Não entendi, fale de novo." (ditado e tradução; o Pergunte fica de fora, porque a resposta pode ser longa) | `ditado/lib/textoInventado.ts`, `ditado/index.ts` | limite = ⌈segundos × `PALAVRAS_POR_SEGUNDO_MAX` (6)⌉ + `FOLGA_PALAVRAS` (2) |
| Prompt: "escreva só o que foi falado; nunca complete, nunca acrescente, o contexto nunca vira texto"; sem fala → `<vazio>`; o "continue a frase" virou "comece com minúscula, isso não é pedido para completar" | `ia/prompts.ts` (ditado, tradução e bloco de contexto) | — |

Conta do caso real: 0,84 s × 6 = 5,04 → 6 + 2 = 8 palavras permitidas; vieram 39 → barrado. Um ditado normal de
2,6 s com 10 palavras tem limite 18 e passa. O Daniel escolheu "não cola e avisa" em vez de "Colar mesmo assim".

## Verificação

- Testes automáticos (`npm test`, 209 passando): o caso real é barrado e ditados reais do histórico passam
  (`textoInventado.test.ts`); silêncio e estalo de 0,05 s são "pouca fala", 0,3 s de fala passa, WAV ilegível não
  bloqueia (`ritmo/index.test.ts`); o prompt não tem mais "continue a frase" (`prompts.test.ts`).
- A amostra de voz `resources/amostra-teste.wav` mede 2,38 s de fala em 3,28 s: passa pela trava.
- `npm run typecheck` e `npm run build` sem erros.
- Não testado com a IA de verdade antes de publicar.

## Uso real (20/10/2026, versão 1.1.1)

Primeiros 6 ditados do Daniel no Kiro depois de instalar a 1.1.1: todos colados, de 0,9 a 4,2 palavras/s, nenhum
barrado pelas travas (inclusive "Ok, valeu.", 2 palavras em 2,2 s). O Daniel: "até agora tá funcionando normalmente".

Falta: acompanhar por mais dias se o texto inventado parou (era raro: 1 em 150) e se algum ditado curto de verdade
é barrado.

## Como reverter

- Travas: subir `PALAVRAS_POR_SEGUNDO_MAX` (ex.: 1000) ou zerar `FALA_MINIMA_IA_S` em `src/shared/config.ts`.
- Prompt e código: voltar os arquivos acima para o commit anterior à versão 1.1.1.
