# Módulo: Formatação do ditado (pausas, listas, tópicos)

**Estado:** construído (17/10/2026). Testes unitários passando; **não testado com IA de verdade** (sem chave
na hora da construção). Amostras de voz para testar: ver "Como testar" no fim.

## Por quê

Daniel: o texto saía corrido quando ele falava rápido, fazia pausa ou ditava tópicos. O Typeless não mede
nada no cliente (só compacta o áudio e manda); quem formata é a IA do servidor, ouvindo o áudio. Aqui
fazemos igual e **damos dicas medidas no Mac**.

## Como funciona

1. **Ritmo medido localmente** (`src/main/features/ia/ritmo/index.ts`, função pura `analisarRitmo(wav)`):
   lê o WAV (acha o chunk `data`), calcula a energia RMS em quadros de 20 ms, estima o ruído de fundo
   (percentil 15) e marca fala/silêncio com limiar adaptativo e histerese. Pausa = silêncio entre dois
   trechos de fala (começo e fim do áudio são ignorados). Devolve `{ duracaoS, falaS, pausas[] }`.
2. **Bloco "Ritmo da fala"** (`ritmo/bloco.ts`): vira texto no fim do sistema do ditado e da tradução
   (`modos.ts`), nos dois caminhos (1 e 2 chamadas). Máximo de 25 pausas; acima disso só as longas.
   Sem pausas, o bloco não vai.
3. **Regras no `PROMPT_DITADO`** (`prompts.ts`): listas faladas ("primeiro…", "um…, dois…", "tópico…",
   "o seguinte: A, B e C"), comandos falados ("novo parágrafo", "nova linha", "tópico"), pausa longa =
   novo parágrafo, fala rápida = frases separadas, chat curto continua curto, terminal sem markdown.
4. **Caminho de 2 chamadas:** onde o serviço devolve tempo/parágrafos de forma documentada, a transcrição
   chega ao modelo com `\n` nas pausas (`lerTranscricaoComQuebras` em `montagemTranscricao.ts`). O
   `AVISO_TRANSCRICAO_AUTOMATICA` explica que quebras de linha marcam pausas.

## Serviços de transcrição

| Serviço | Mudança | Fonte |
|---|---|---|
| Groq | `response_format=verbose_json` + `timestamp_granularities[]=segment`; quebra onde o intervalo entre segmentos é ≥ 1,2 s | https://console.groq.com/docs/speech-to-text (lista os dois valores; **não** cita o `whisper-large-v3-turbo` pelo nome. Se o serviço recusar com 400/422, repete sem a marcação) |
| Deepgram | `paragraphs=true` só com idioma único (pt-BR); um parágrafo por linha | https://developers.deepgram.com/docs/paragraphs (não confirma combinação com `language=multi`, por isso fica fora dele) |
| ElevenLabs | **Pedido não muda.** Leitura defensiva de `words[].start/end`: quebra onde a pausa ≥ 1,2 s | https://elevenlabs.io/docs/api-reference/speech-to-text/convert (exemplo de resposta traz `words`; o padrão de `timestamps_granularity` não está documentado, então não pedimos) |
| OpenAI | **Sem mudança.** `timestamp_granularities[]` é documentado só para `whisper-1`; para `gpt-transcribe` não | https://developers.openai.com/api/docs/guides/speech-to-text (a página da API retornou 403) |
| Mistral | **Sem mudança** (não pesquisado/confirmado) | — |

Em todos, se o campo não vier ou vier fora do formato, usa o texto simples (nunca falha por isso). Nova
tentativa em 400/422 agora vem sem dicionário **e** sem marcação.

## Valores ajustáveis

- `ritmo/index.ts` (topo): `PAUSA_MINIMA_S` 0,45 · `PAUSA_LONGA_S` 1,2 · `QUADRO_S` 0,02 ·
  `PERCENTIL_RUIDO` 0,15 · `FATOR_LIMIAR_ENTRADA` 3 · `FATOR_LIMIAR_SAIDA` 2 · `ENERGIA_MINIMA` 0,005 ·
  `FRACAO_MAXIMA_DO_P90` 0,15 · `FALA_MINIMA_S` 0,1.
- `ritmo/bloco.ts`: `MAX_PAUSAS_NO_BLOCO` 25.
- `montagemTranscricao.ts`: `PAUSA_QUEBRA_S` 1,2.
- Texto das regras: `PROMPT_DITADO` em `prompts.ts`.

## Limites

- A medição é de energia, não de palavras: ruído alto e constante (ventilador, música) pode esconder pausas;
  respiração forte pode contar como fala.
- Os tempos do bloco são do áudio; no caminho de 2 chamadas o modelo de texto não sabe a que palavra cada
  pausa corresponde, só quantas houve (a ajuda mais precisa vem das quebras de linha da transcrição).
- O resultado final depende do modelo seguir o prompt; não há pós-processamento do texto.

## Como testar (com a chave, pelo dono)

Quatro WAVs de voz sintética (lista, tópicos, duas ideias com pausa longa, fala corrida) e o resultado
esperado de cada um ficam fora do repositório, no `LEIAME.md` da pasta `amostras-ritmo` do scratchpad da
sessão. Testes automáticos: `npm test` (`ritmo/index.test.ts`, `montagemTranscricao.test.ts`).
