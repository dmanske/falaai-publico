# Módulo: Configurações da IA (vários provedores)

**Estado:** pronto (17/10/2026). Lovable testada com chave real; os outros provedores só testados
com chave falsa (respondem "Chave recusada"). Pesquisa em
[integracoes/PROVEDORES_IA.md](../integracoes/PROVEDORES_IA.md).

## O que faz

Tela Configurações > IA (e o passo "Chave" do onboarding):
- **Provedor:** grade com Lovable, Gemini, OpenRouter, OpenAI, Anthropic (Claude), Groq, Mistral e
  DeepSeek. Cada cartão diz se o modelo "ouve áudio" ou "precisa de transcrição".
- **Chave por provedor:** cada um guarda a sua (cifrada com safeStorage, só os 4 últimos
  caracteres na tela), com o link "Onde pegar a chave".
- **Modelo:** lista do catálogo ou id digitado. O modelo escolhido fica guardado por provedor
  (`preferencias.modeloPorProvedor`).
- **OpenRouter:** lista ao vivo de `openrouter.ai/api/v1/models`, agrupada por fabricante, com
  preço por milhão de tokens (entrada/saída/áudio), selo "grátis", busca e o filtro "só os que
  ouvem áudio" (desligável). Cache de 24 h em `<userData>/openrouter-modelos.json`.
- **Transcrição:** quando o modelo não ouve áudio, escolhe-se um serviço de fala → texto
  (OpenAI, Groq, ElevenLabs, Deepgram ou Mistral), com chave própria.
- **Testar:** (1) texto "ok"; (2) só no caminho de 2 chamadas, o serviço transcreve a amostra;
  (3) o ditado completo com a amostra (deve conter "ditado"). No caminho de 1 chamada tenta os
  formatos `input_audio` e `file` e guarda o que funcionou em `preferencias.formatoAudio`.

## Como o ditado chama a IA (`src/main/features/ia/motor.ts`)

- **1 chamada:** o modelo ouve áudio → chat no formato OpenAI com o WAV (16 kHz mono) em base64.
- **2 chamadas:** serviço de transcrição → texto vai para o modelo com
  `AVISO_TRANSCRICAO_AUTOMATICA` no começo do prompt.
- **Anthropic:** sempre 2 chamadas (o Claude não recebe áudio). SDK oficial `@anthropic-ai/sdk`,
  `output_config.effort: "low"`, sem `thinking`. Padrão `claude-opus-5-5`; Opus 5.5 e Sonnet 5.5
  usam o *fallback* do servidor (`betas: ["server-side-fallback-2026-07-01"]`, `fallbacks: "default"`);
  Haiku 5.5 pode ser escolhido para ficar mais barato.
- Trocar de provedor ou de modelo zera `formatoAudio` (precisa testar de novo).

## Onde fica

| Parte | Arquivo |
|---|---|
| Catálogo de provedores, modelos e serviços | `src/shared/provedores.ts` |
| Chaves (safeStorage) | `src/main/features/chaves/` |
| Preferências e migração do `modelo` antigo | `src/main/features/preferencias/` |
| Roteamento 1 ou 2 chamadas | `src/main/features/ia/motor.ts` |
| Chat OpenAI-compatível / Anthropic | `src/main/features/ia/provedores/chatOpenAI.ts`, `anthropic.ts` |
| Transcrição | `src/main/features/ia/provedores/transcricao.ts`, `montagemTranscricao.ts` |
| Lista do OpenRouter | `src/main/features/ia/provedores/openrouter.ts`, `openrouterConversao.ts` |
| Mensagens de erro | `src/main/features/ia/provedores/erros.ts` |
| Teste da chave | `src/main/features/ia/testeChave.ts` |
| Tela | `src/renderer/src/features/configuracoes/` (`SecaoIa`, `GradeProvedores`, `SeletorModeloOpenRouter`, `BlocoTranscricao`) |
| Amostra de voz | `resources/amostra-teste.wav` (gerada por `npm run amostra-teste`) |

## Limpeza da chave

Toda chave passa por `limparChave` ao salvar e ao ler (`features/chaves/lib/limparChave.ts`), porque
costuma vir colada com a linha de baixo do `.env`. Ver
[correção de 17/10/2026](../correcoes/CORRECAO_CHAVE_LOVABLE_COLADA_2026-10-17.md).

## Mensagens de erro

401/403 (ou 400 com "API key not valid") → chave recusada · 402 ou 429 "insufficient_quota" → sem
créditos · 404 → modelo não encontrado · 413 → áudio grande demais · 429 → limite · tempo esgotado →
"A IA demorou demais". O detalhe do provedor vai junto, entre parênteses.

## Verificado em 17/10/2026

- Lovable com a chave do Daniel (Gemini 3 Flash): texto ok; amostra transcrita como
  "Teste de ditado, 1, 2, 3." em 1,75 s, formato `input_audio`.
- Lista do OpenRouter carregada ao vivo: 33 modelos que ouvem áudio, sem erro.
- Chave falsa nos 8 provedores de chat e nos 5 de transcrição: todos devolveram "Chave recusada…".

## Falta testar com chave real

Fallback e `effort` do Anthropic · `input_audio` e `context_bias` do Mistral · `gpt-transcribe` só
com `prompt` · Deepgram com `multi` · cada serviço transcrevendo a amostra · app empacotado com o SDK.
