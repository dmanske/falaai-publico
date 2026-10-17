# Provedores de IA com entrada de áudio para o FalaAi

Pesquisa feita em **17/10/2026**, na documentação oficial de cada provedor. Os testes com chave falsa foram feitos por requisição real (sem áudio e sem chave real). Onde a documentação não deixou algo claro, está marcado como **não confirmado**.

Contexto: o FalaAi grava WAV 16 kHz mono 16-bit (2 s a 6 min, tipicamente até 60 s). 6 min nesse formato = 11,5 MB (16000 Hz x 2 bytes x 360 s), ou ~15,4 MB em base64. Isso importa para os limites de tamanho abaixo.

- **1 chamada:** modelo de chat que recebe o áudio e já devolve o texto limpo.
- **2 chamadas:** serviço de transcrição, depois um modelo de texto limpa com o prompt.

## 1. Tabela resumo

| Provedor | Áudio em 1 chamada? | Transcrição separada? | Modelo recomendado (ID exato) | Auth | Link |
|---|---|---|---|---|---|
| Lovable gateway (hoje) | Sim (`input_audio`) | não se aplica | `google/gemini-3-flash-preview` | chave do gateway | (atual) |
| OpenAI | Sim, só com modelos "audio" (`gpt-audio-1.5`) | Sim: `gpt-transcribe` | 2 chamadas: `gpt-transcribe` + `gpt-6-luna` | `Authorization: Bearer` | [guia](https://developers.openai.com/api/docs/guides/speech-to-text) |
| Google Gemini (direto) | Sim (`generateContent` e endpoint OpenAI-compatível) | não existe endpoint dedicado | `gemini-3.8-flash` (ou `gemini-3.5-flash-lite` mais barato) | `x-goog-api-key` (ou Bearer no endpoint compatível) | [áudio](https://ai.google.dev/gemini-api/docs/audio) |
| Groq | Não | Sim: `whisper-large-v3-turbo` | 2 chamadas: whisper + `openai/gpt-oss-20b` | `Authorization: Bearer` | [STT](https://console.groq.com/docs/speech-to-text) |
| OpenRouter | Sim (`input_audio`, em vários modelos) | Não documentado | `google/gemini-3.8-flash` / `google/gemini-3.5-flash-lite` | `Authorization: Bearer` | [áudio](https://openrouter.ai/docs/guides/overview/multimodal/audio) |
| Mistral | Sim (`voxtral-small-latest`) | Sim: `voxtral-mini-latest` | 1 chamada: `voxtral-small-latest` | `Authorization: Bearer` | [áudio](https://docs.mistral.ai/studio/audio/overview) |
| xAI (Grok) | Não confirmado (chat sem áudio na doc) | Sim: `POST /v1/stt` | 2 chamadas: `/v1/stt` + modelo grok de texto | `Authorization: Bearer` | [voice](https://docs.x.ai/developers/rest-api-reference/inference/voice) |
| DeepSeek | Não (só texto; imagem em `deepseek-flash`) | Não | só serve para a etapa de limpeza | `Authorization: Bearer` | [pricing](https://api-docs.deepseek.com/quick_start/pricing) |
| ElevenLabs | Não | Sim: Scribe `scribe_v2` | só transcrição | `xi-api-key` | [API](https://elevenlabs.io/docs/api-reference/speech-to-text/convert) |
| Deepgram | Não | Sim: `nova-3` | só transcrição | `Authorization: Token` | [pré-gravado](https://developers.deepgram.com/docs/pre-recorded-audio) |

### Diferenças em relação ao esperado

1. **Nomes de modelos mudaram bastante** em relação ao que se costuma assumir: OpenAI agora recomenda `gpt-transcribe` (não `gpt-4o-transcribe`) e o modelo barato de texto é `gpt-6-luna`; Gemini atual é a família 3.x (`gemini-3.8-flash`), e `gemini-2.5-*` virou "acesso restrito" para projetos novos.
2. **OpenAI**: o único modelo de chat com áudio de entrada citado na documentação é `gpt-audio-1.5`. Os modelos de texto (`gpt-6-luna`) aceitam só texto e imagem. Então "OpenAI em 1 chamada" só funciona com `gpt-audio-1.5` (mais caro, e exige `modalities`); o caminho natural é 2 chamadas.
3. **Gemini**: a documentação nova destaca a "Interactions API" (`/v1beta/interactions`), mas `generateContent` continua oficialmente suportado ("remains fully supported"). O endpoint compatível com OpenAI **aceita `input_audio`** com `format: "wav"`, ou seja, o mesmo corpo que o app já usa hoje, só trocando URL, chave e modelo.
4. **xAI tem transcrição** (`POST https://api.x.ai/v1/stt`, US$ 0,10/h), o que eu não esperava.
5. **Mistral**: o endpoint de transcrição aceita `context_bias` (até 100 termos), mas é otimizado para inglês (português é "experimental").
6. **Códigos de erro com chave falsa variam**: xAI e Gemini devolvem **400** (não 401); OpenRouter devolve mensagem diferente conforme o formato da chave (ver seção 5).
7. **OpenAI `gpt-transcribe`**: o parâmetro de idioma é `languages` (plural); `language` (singular) só vale para `whisper-1`. Não enviar os dois.

---

## 2. OpenAI

- Base: `https://api.openai.com/v1`
- Auth: `Authorization: Bearer SUA_CHAVE`

### 2.1 Transcrição (recomendado para o caminho de 2 chamadas)

Endpoint: `POST /v1/audio/transcriptions` (multipart).

Modelos ([guia de speech-to-text](https://developers.openai.com/api/docs/guides/speech-to-text), [lista de modelos](https://developers.openai.com/api/docs/models)):
- `gpt-transcribe`: recomendado para fala gravada no idioma original. US$ 0,0045 por minuto ([página do modelo](https://developers.openai.com/api/docs/models/gpt-transcribe)). Suporta `prompt`, `keywords` e `languages`. Só funciona em `v1/audio/transcriptions` e Realtime (não em chat completions).
- `gpt-4o-transcribe`, `gpt-4o-mini-transcribe`: continuam disponíveis; suportam `prompt`.
- `whisper-1`: `language` singular, `prompt` limitado a 224 tokens, timestamps.
- `gpt-4o-transcribe-diarize`: só identificação de falantes; não aceita `prompt`.

Limites: arquivo de até **25 MB**; formatos mp3, mp4, mpeg, mpga, m4a, **wav**, webm. A página não declara limite de duração. Um WAV de 6 min (11,5 MB) cabe.

Parâmetros úteis para o dicionário do usuário:
- `prompt`: contexto livre (em `gpt-transcribe`).
- `keywords`: termos literais esperados; cada um em uma linha, sem `<`, `>`, CR ou LF.
- `languages`: idiomas esperados (ex.: `pt`). **Não enviar junto com `language`.**

**Não confirmado**: o formato exato de envio de `keywords`/`languages` no multipart (campo repetido `keywords[]` ou um único campo). A página de referência da API não os lista no corpo; só o guia os cita. Testar com chave real antes de fixar.

Exemplo:

```bash
curl https://api.openai.com/v1/audio/transcriptions \
  -H "Authorization: Bearer SUA_CHAVE" \
  -F model=gpt-transcribe \
  -F file=@audio.wav \
  -F languages=pt \
  -F "prompt=Ditado em português do Brasil. Termos: Supabase, FalaAi."
```

Resposta: `{"text": "...", "languages": [{"code":"pt"}], "usage": {...}}`. O texto está em `text`.

### 2.2 Chat com áudio de entrada (1 chamada)

Endpoint: `POST /v1/chat/completions`. Modelo citado na [doc de áudio em chat completions](https://developers.openai.com/api/docs/guides/audio-chat-completions): `gpt-audio-1.5`. (No OpenRouter existem também `openai/gpt-audio` e `openai/gpt-audio-mini`.) A doc exige `"modalities": ["text","audio"]` nos exemplos; para receber só texto, **não confirmado** se `["text"]` é aceito (testar). Formatos de entrada permitidos: a doc só mostra `wav`; mp3 é **não confirmado** nesta página.

```json
{
  "model": "gpt-audio-1.5",
  "modalities": ["text", "audio"],
  "messages": [
    {"role": "system", "content": "PROMPT DE LIMPEZA"},
    {"role": "user", "content": [
      {"type": "input_audio", "input_audio": {"data": "<base64>", "format": "wav"}}
    ]}
  ]
}
```

Texto na resposta: `choices[0].message.content` ou, se vier como áudio, a transcrição em `choices[0].message.audio.transcript` (**não confirmado**, comportamento a testar). Por causa dessas incertezas e do preço, não recomendo este caminho.

### 2.3 Modelo de texto para limpeza

`gpt-6-luna`: "modelo mais eficiente" da OpenAI, texto+imagem, US$ 0,10 / 1M tokens de entrada e US$ 0,50 / 1M de saída, contexto de 1.050.000 tokens, suportado em Chat Completions e Responses ([página do modelo](https://developers.openai.com/api/docs/models/gpt-6-luna)). O esforço de raciocínio padrão é `medium`; para limpeza de texto use `"reasoning_effort": "none"` em Chat Completions para reduzir latência (parâmetro conforme a página do modelo, `reasoning.effort` no Responses; o nome exato em Chat Completions é **não confirmado**). Melhor qualidade: `gpt-6-astra` (flagship), com `gpt-6.1-sol` como meio-termo.

```json
{
  "model": "gpt-6-luna",
  "messages": [
    {"role": "system", "content": "PROMPT DE LIMPEZA"},
    {"role": "user", "content": "<texto transcrito>"}
  ]
}
```

Texto: `choices[0].message.content`.

### 2.4 Teste sem chave (confirmado em 17/10/2026)

`GET /v1/models`, `POST /v1/audio/transcriptions` e `POST /v1/chat/completions` com `Bearer chave-falsa` retornam **HTTP 401**:

```json
{"error":{"message":"Incorrect API key provided: chave-falsa. You can find your API key at https://platform.openai.com/account/api-keys.","type":"invalid_request_error","param":null,"code":"invalid_api_key"}}
```

---

## 3. Google Gemini (API direta, AI Studio)

- Base: `https://generativelanguage.googleapis.com/v1beta`
- Auth nativa: `x-goog-api-key: SUA_CHAVE`. No endpoint compatível com OpenAI: `Authorization: Bearer SUA_CHAVE` ([doc](https://ai.google.dev/gemini-api/docs/openai)).

### 3.1 Modelos (fonte: [lista de modelos](https://ai.google.dev/gemini-api/docs/models))

| Modelo | ID | Status |
|---|---|---|
| Gemini 3.8 Flash | `gemini-3.8-flash` | estável, o mais novo (recomendado qualidade) |
| Gemini 3.6 Flash | `gemini-3.6-flash` | estável |
| Gemini 3.5 Flash-Lite | `gemini-3.5-flash-lite` | estável (recomendado rápido/barato) |
| Gemini 3.1 Flash-Lite | `gemini-3.1-flash-lite` | estável |
| Gemini 3 Flash | `gemini-3-flash-preview` | preview (o que o app usa hoje via Lovable) |
| Gemini 2.5 Flash / Flash-Lite | `gemini-2.5-flash`, `gemini-2.5-flash-lite` | legado, acesso restrito a quem já usava |

Não há alias `-latest` listado na doc oficial.

### 3.2 `generateContent` com áudio (caminho nativo)

`POST /v1beta/models/gemini-3.8-flash:generateContent`. A [referência](https://ai.google.dev/api/generate-content) confirma que o método segue suportado e usa `inline_data` com `mime_type` e `data` (base64) no exemplo curl de imagem; a doc de áudio atual mostra o áudio no formato da Interactions API (`{"type":"audio","data":...,"mime_type":...}`), então **para `generateContent` o formato de áudio `inline_data` é inferido do exemplo de imagem, não de um exemplo de áudio**. Testar.

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent" \
  -H "x-goog-api-key: SUA_CHAVE" -H "Content-Type: application/json" \
  -d '{
    "system_instruction": {"parts": [{"text": "PROMPT DE LIMPEZA"}]},
    "contents": [{"parts": [
      {"inline_data": {"mime_type": "audio/wav", "data": "<base64>"}}
    ]}]
  }'
```

Texto: `candidates[0].content.parts[0].text`.

Alternativa documentada hoje (Interactions API, "recomendada para novos projetos", GA desde junho de 2026, [doc](https://ai.google.dev/gemini-api/docs/interactions)): `POST /v1beta/interactions` com `{"model":"gemini-3.8-flash","input":[{"type":"text","text":"..."},{"type":"audio","data":"<base64>","mime_type":"audio/wav"}]}`; o texto vem no passo `model_output` (nos SDKs, `output_text`). O caminho de resposta em JSON cru é **não confirmado**; por isso prefiro `generateContent` ou o endpoint compatível.

Limites ([doc de áudio](https://ai.google.dev/gemini-api/docs/audio)): requisição inline de até **20 MB no total** (prompt + arquivos); acima disso, Files API. Até 9,5 h de áudio por prompt. 32 tokens por segundo de áudio (1 min = 1.920 tokens). MIME aceitos: `audio/wav`, `audio/mp3`, `audio/aiff`, `audio/aac`, `audio/ogg`, `audio/flac`, `audio/mpeg`, `audio/m4a`, `audio/l16`, `audio/opus`, `audio/alaw`, `audio/mulaw`, `audio/webm`. WAV de 6 min em base64 (~15,4 MB) cabe nos 20 MB.

### 3.3 Endpoint compatível com OpenAI (caminho mais fácil para o FalaAi)

`POST https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`, **aceita `input_audio`** (confirmado na [doc](https://ai.google.dev/gemini-api/docs/openai), seção "Audio understanding", exemplo com WAV). O corpo é idêntico ao que o app envia hoje ao gateway Lovable:

```bash
curl https://generativelanguage.googleapis.com/v1beta/openai/chat/completions \
  -H "Authorization: Bearer SUA_CHAVE" -H "Content-Type: application/json" \
  -d '{
    "model": "gemini-3.8-flash",
    "messages": [
      {"role": "system", "content": "PROMPT DE LIMPEZA"},
      {"role": "user", "content": [
        {"type": "input_audio", "input_audio": {"data": "<base64>", "format": "wav"}}
      ]}
    ]
  }'
```

Texto: `choices[0].message.content`. Vocabulário/dicionário: vai no próprio prompt de sistema (não há parâmetro dedicado).

### 3.4 Teste sem chave (confirmado em 17/10/2026)

Retorna **HTTP 400** (não 401). Nativo (`generateContent` e `interactions`), com `x-goog-api-key: chave-falsa`:

```json
{"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID","domain":"googleapis.com", ...}]}}
```

Endpoint compatível com OpenAI, com `Bearer chave-falsa`: HTTP 400 com `[{"error":{"code":400,"message":"Please pass a valid API key","status":"INVALID_ARGUMENT"}}]` (note que o corpo vem dentro de um **array**).

---

## 4. Groq

- Base: `https://api.groq.com/openai/v1`
- Auth: `Authorization: Bearer SUA_CHAVE`

### 4.1 Transcrição ([doc](https://console.groq.com/docs/speech-to-text))

`POST /openai/v1/audio/transcriptions` (multipart), compatível com OpenAI.

- `whisper-large-v3-turbo`: US$ 0,04/hora, multilíngue, só transcrição. Melhor custo-benefício.
- `whisper-large-v3`: US$ 0,111/hora; recomendado para aplicações sensíveis a erro.
- Limites: 25 MB (plano grátis), 100 MB (dev tier); mínimo cobrado de 10 s por requisição; formatos flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm.
- Parâmetros: `file` (ou `url`), `model`, `language` (ISO-639-1, melhora precisão e latência), `prompt` (estilo/ortografia, até 224 tokens; serve para o dicionário), `response_format` (`json` padrão, `text`, `verbose_json`), `temperature` (padrão 0).

```bash
curl https://api.groq.com/openai/v1/audio/transcriptions \
  -H "Authorization: Bearer SUA_CHAVE" \
  -F model=whisper-large-v3-turbo -F language=pt \
  -F "prompt=Termos: Supabase, FalaAi" -F file=@audio.wav
```

Texto: `text`.

### 4.2 Chat de texto para limpeza ([modelos](https://console.groq.com/docs/models))

`POST /openai/v1/chat/completions`. Produção: `openai/gpt-oss-20b` (~1.000 tokens/s, US$ 0,075 / US$ 0,30 por 1M) e `openai/gpt-oss-120b` (~500 tokens/s, US$ 0,15 / US$ 0,60). Também `llama-3.1-8b-instant` e `llama-3.3-70b-versatile` (preço "Enterprise" na página). Texto: `choices[0].message.content`. Groq não tem chat com áudio.

### 4.3 Teste sem chave (confirmado)

`GET /openai/v1/models`, `POST .../audio/transcriptions` e `POST .../chat/completions` com `Bearer chave-falsa`: **HTTP 401**

```json
{"error":{"message":"Invalid API Key","type":"invalid_request_error","code":"invalid_api_key"}}
```

---

## 5. OpenRouter

- Base: `https://openrouter.ai/api/v1`, endpoint `POST /chat/completions`.
- Auth: `Authorization: Bearer SUA_CHAVE` (chaves começam com `sk-or-v1-`).
- Headers recomendados (opcionais, para atribuição/ranking): `HTTP-Referer` e `X-Title`. **Não confirmei esses nomes na doc nesta pesquisa**; são os documentados historicamente. Não são necessários para funcionar.

Áudio ([doc](https://openrouter.ai/docs/guides/overview/multimodal/audio)): parte `input_audio` em base64 (URL direta **não** é suportada), com campo `format`. Formatos citados: WAV, MP3, AIFF, AAC, OGG Vorbis, FLAC, M4A, PCM16, PCM24; o suporte varia por modelo/provedor. Não há endpoint de transcrição documentado; a transcrição é feita via chat com prompt de texto.

```json
{
  "model": "google/gemini-3.8-flash",
  "messages": [
    {"role": "system", "content": "PROMPT DE LIMPEZA"},
    {"role": "user", "content": [
      {"type": "input_audio", "input_audio": {"data": "<base64>", "format": "wav"}}
    ]}
  ]
}
```

Texto: `choices[0].message.content`.

Modelos com áudio de entrada, listados pela API pública `GET https://openrouter.ai/api/v1/models?input_modalities=audio&output_modalities=text` em 17/10/2026 (48 modelos; preços por token, entrada/saída, convertidos para US$/1M):

| ID | entrada | saída | áudio |
|---|---|---|---|
| `google/gemini-3.8-flash` | 0,825 | 4,125 | 0,825 |
| `google/gemini-3.6-flash` | 0,75 | 3,75 | 0,75 |
| `google/gemini-3.5-flash-lite` | 0,30 | 2,50 | 0,30 |
| `google/gemini-3.1-flash-lite` | 0,25 | 1,50 | 0,50 |
| `google/gemini-3-flash-preview` | 0,50 | 3,00 | 1,00 |
| `google/gemini-2.5-flash-lite` | 0,10 | 0,40 | 0,30 |
| `openai/gpt-audio-mini` | 0,60 | 2,40 | 0,60 |
| `openai/gpt-audio` | 2,50 | 10,00 | 32,00 |
| `mistralai/voxtral-small-24b-2507` | 0,10 | 0,30 | 100,00 |
| `qwen/qwen3.8-omni-flash` | 0,15 | 0,47 | n/d |
| `xiaomi/mimo-v2.6-flash` | 0,14 | 0,28 | n/d |
| `thinkingmachines/inkling-small:free` | 0 | 0 | n/d |

Modelos gratuitos (`:free`) existem, mas costumam ter limite de taxa. O ID `~google/gemini-flash-latest` aparece como alias que aponta para o Flash mais recente.

Teste sem chave (confirmado), HTTP **401** nos dois casos:
- Com `Bearer sk-or-v1-chavefalsa0000`: `{"error":{"message":"User not found.","code":401}}`
- Com `Bearer chave-falsa` (sem o prefixo `sk-or-`): `{"error":{"message":"Missing Authentication header","code":401}}` (mensagem enganosa; o header estava presente)

---

## 6. Mistral

- Base: `https://api.mistral.ai/v1`
- Auth: `Authorization: Bearer SUA_CHAVE`

### 6.1 Transcrição (2 chamadas) ([API](https://docs.mistral.ai/api/endpoint/audio/transcriptions), [guia](https://docs.mistral.ai/studio/audio/speech_to_text/offline_transcription))

`POST /v1/audio/transcriptions`, modelo `voxtral-mini-latest` (Voxtral Mini Transcribe 2; também aparece o ID datado `voxtral-mini-2602` em exemplos). Campos: `model` (obrigatório), `file` (multipart), `file_id`, `file_url`, `language` (opcional; melhora a precisão), `context_bias` (array, **até 100 termos**; otimizado para inglês, outros idiomas "experimental"), `diarize`, `stream`, `temperature`, `timestamp_granularities` (**incompatível com `language`**). Recomendações: enviar o arquivo por upload. Duração: até 3 horas por requisição. Limite de tamanho em MB: **não declarado**. Idiomas: 13 (inclui português).

Resposta: `{"model","text","language","segments","usage"}`; texto em `text`. Exemplo (campos conforme a referência; curl multipart **não conferido verbatim**, validar com chave real):

```bash
curl https://api.mistral.ai/v1/audio/transcriptions \
  -H "Authorization: Bearer SUA_CHAVE" \
  -F model=voxtral-mini-latest -F language=pt -F file=@audio.wav
```

### 6.2 Chat com áudio (1 chamada)

`POST /v1/chat/completions`, modelo `voxtral-small-latest` (Voxtral Small, "primeiro modelo com entrada de áudio para uso instruct"). A doc mostra `input_audio` com base64 em Python (formato exato do JSON, incluindo se é `format` ou outro campo: **não confirmado**; seguir o mesmo padrão OpenAI e testar).

```json
{
  "model": "voxtral-small-latest",
  "messages": [
    {"role": "system", "content": "PROMPT DE LIMPEZA"},
    {"role": "user", "content": [
      {"type": "input_audio", "input_audio": {"data": "<base64>", "format": "wav"}}
    ]}
  ]
}
```

Texto: `choices[0].message.content`. Para limpeza em 2 chamadas, Mistral Small 4 (v26.03) e Ministral 3 são os modelos de texto citados na [lista](https://docs.mistral.ai/models); os IDs de API exatos **não estão na página** (provável `mistral-small-latest`, não confirmado).

### 6.3 Teste sem chave (confirmado)

`GET /v1/models`, `POST /v1/audio/transcriptions`, `POST /v1/chat/completions` com `Bearer chave-falsa`: **HTTP 401** `{"detail":"Invalid API Key"}`

---

## 7. xAI (Grok) e DeepSeek

### xAI

- Chat: a [página de modelos](https://docs.x.ai/docs/models) não afirma que nenhum modelo grok de chat aceite áudio. Modelos de texto atuais: `grok-4.7`, `grok-4.6`, `grok-4.5`, `grok-4.3`. Considerar **sem áudio em chat**.
- Speech-to-text existe ([referência de voz](https://docs.x.ai/developers/rest-api-reference/inference/voice)): `POST https://api.x.ai/v1/stt` (multipart), US$ 0,10/h (REST). Campos: `file` (deve ser o **último** campo do formulário) ou `url`, `language`, `format` (true/false; normalização de números; exige `language`), `keyterm` (repetível, até 100 termos de até 50 caracteres), `diarize`, `filler_words` (padrão false, remove "uh/um"), entre outros. Modelo: o REST não tem campo `model`; o streaming usa `grok-voice-transcribe-2.0` por padrão. Limite: 500 MB; WAV, mp3, ogg, opus, flac, aac, mp4, m4a. Resposta: `text`, `language`, `duration`, `words`. Auth Bearer (inferido, a seção REST não declara; o teste abaixo confirma que a chave é verificada).
- Teste sem chave (confirmado): HTTP **400** (não 401) em `/v1/models`, `/v1/chat/completions` e `/v1/stt`: `{"code":"invalid-argument","error":"Incorrect API key provided. You can obtain an API key from https://console.x.ai."}` (em `/v1/stt` o campo `code` vem como `"Client specified an invalid argument"`).

### DeepSeek

- Modelos: `deepseek-flash` e `deepseek-v4-pro` ([doc](https://api-docs.deepseek.com/quick_start/pricing)). Imagem só em `deepseek-flash`. **Áudio: não mencionado, tratar como não suportado.** Serve só como etapa de limpeza de texto: base `https://api.deepseek.com`, `POST /chat/completions`, Bearer.
- Teste sem chave (confirmado): HTTP **401** `{"error":{"message":"Authentication Fails, Your api key: ****alsa is invalid (request_id: ...)","type":"authentication_error","param":null,"code":"invalid_request_error"}}`

---

## 8. Serviços só de transcrição

### 8.1 ElevenLabs Scribe ([referência](https://elevenlabs.io/docs/api-reference/speech-to-text/convert), [visão geral](https://elevenlabs.io/docs/overview/capabilities/speech-to-text))

- `POST https://api.elevenlabs.io/v1/speech-to-text` (multipart); existem servidores regionais (US, EU, Índia, Singapura).
- Auth: `xi-api-key: SUA_CHAVE`.
- Campos: `model_id` (obrigatório; exemplos usam `scribe_v2`), `file` (mínimo 100 ms, máximo 5 GB nesta referência; a visão geral diz 3 GB, divergência documental), `language_code` (ISO-639-1/3; se omitido detecta sozinho), `keyterms` (até 1.000 termos, menos de 50 caracteres e até 5 palavras cada; **cobra 20% a mais**; com mais de 100 termos há mínimo cobrado de 20 s).
- Modelos: Scribe v2 (lote), Scribe v2 Realtime, Scribe v2 Medical. ID exato além de `scribe_v2`: **não confirmado**.
- Duração: até 10 h (modo padrão). 90+ idiomas.
- Resposta: `text`, `language_code`, `language_probability`, `words`, `audio_duration_secs`.

```bash
curl https://api.elevenlabs.io/v1/speech-to-text \
  -H "xi-api-key: SUA_CHAVE" \
  -F model_id=scribe_v2 -F language_code=por -F file=@audio.wav
```

- Teste sem chave (confirmado): `POST /v1/speech-to-text` e `GET /v1/models` com `xi-api-key: chave-falsa`: HTTP **401**
  `{"detail":{"type":"authentication_error","code":"unauthorized","message":"Invalid API key","status":"invalid_api_key","request_id":"..."}}`

### 8.2 Deepgram ([pré-gravado](https://developers.deepgram.com/docs/pre-recorded-audio), [modelos](https://developers.deepgram.com/docs/models-languages-overview), [keyterm](https://developers.deepgram.com/docs/keyterm))

- `POST https://api.deepgram.com/v1/listen`, corpo = **bytes brutos** do áudio (não multipart), `Content-Type: audio/wav`.
- Auth: `Authorization: Token SUA_CHAVE`.
- Query: `model=nova-3` (padrão sem informar é `base`), `smart_format=true`, `language=pt-BR` (nova-3 aceita `pt`, `pt-BR`, `pt-PT`; `language=multi` para multilíngue), `detect_language` (documentado na referência da API, não conferido nesta pesquisa), `keyterm=termo` repetido por termo (nova-3 e Flux; limite de 500 tokens por requisição; não separar por vírgula, ponto e vírgula ou quebra de linha: não dá erro, mas vira um termo único e nada é reforçado).
- Limite: 2 GB. Flux é o modelo de streaming em tempo real (`flux-general-multi` para português), não precisa para ditado em arquivo.
- Texto: `results.channels[0].alternatives[0].transcript`.

```bash
curl --request POST \
  --header "Authorization: Token SUA_CHAVE" --header "Content-Type: audio/wav" \
  --data-binary @audio.wav \
  "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&language=pt-BR&keyterm=Supabase&keyterm=FalaAi"
```

- Teste sem chave (confirmado): `POST /v1/listen` com `Token chave-falsa`: HTTP **401** `{"err_code":"INVALID_AUTH","err_msg":"Invalid credentials.","request_id":"..."}`. `GET /v1/projects`: 401 `{"category":"UNAUTHORIZED","message":"Authentication failed.","details":"Check that you are using the correct credentials.","request_id":"..."}`.

---

## 9. Recomendação para o FalaAi

### Estratégia

Manter o caminho atual (1 chamada, formato OpenAI `input_audio`) como padrão e adicionar o de 2 chamadas como alternativa. Como o corpo `input_audio` é o mesmo, vários provedores entram apenas trocando `baseUrl`, `modelo` e chave:

**Caminho 1 chamada (formato OpenAI chat/completions com `input_audio`):**
1. **Google Gemini direto**: base `https://generativelanguage.googleapis.com/v1beta/openai/`, modelo `gemini-3.8-flash` (qualidade) ou `gemini-3.5-flash-lite` (barato). Mesma forma do gateway atual. Prioridade 1.
2. **OpenRouter**: base `https://openrouter.ai/api/v1`, mesmo corpo, escolhe modelo com áudio (ex.: `google/gemini-3.8-flash`). Cobre quem tem só chave OpenRouter. Prioridade 2.
3. **Mistral**: `voxtral-small-latest`, confirmar o formato `input_audio` com uma chave real. Prioridade 3.

**Caminho 2 chamadas (transcrever, depois limpar):**
- Transcrição: **OpenAI `gpt-transcribe`**, **Groq `whisper-large-v3-turbo`** (mais barato e rápido), **ElevenLabs `scribe_v2`**, **Deepgram `nova-3`**, **Mistral `voxtral-mini-latest`**, **xAI `/v1/stt`**.
- Limpeza: qualquer modelo de texto do provedor que o usuário já tem (OpenAI `gpt-6-luna`, Groq `openai/gpt-oss-20b`, DeepSeek `deepseek-flash`, xAI `grok-*`, Mistral, Claude).

### Combinações para quem só tem chave de um provedor sem áudio

| Chave que o usuário tem | Combinação |
|---|---|
| Claude (Anthropic) | transcrição com chave de outro serviço (OpenAI, Groq, ElevenLabs, Deepgram) + Claude para limpar. Exige 2 chaves. |
| DeepSeek | idem: só limpa; precisa de chave de transcrição à parte. |
| OpenAI | `gpt-transcribe` + `gpt-6-luna` (uma chave só, 2 chamadas). |
| Groq | `whisper-large-v3-turbo` + `openai/gpt-oss-20b` (uma chave só, 2 chamadas, muito rápido). |
| xAI | `/v1/stt` + `grok-*` de texto (uma chave só). |
| Mistral | `voxtral-small-latest` em 1 chamada, ou `voxtral-mini-latest` + modelo de texto. |
| Só ElevenLabs ou só Deepgram | entregam o texto bruto, sem limpeza (a limpeza por LLM não é possível sem outra chave); aplicar apenas formatação do próprio serviço (`smart_format=true` no Deepgram). |

### Pontos de atenção na implementação

- Colocar provedores, modelos e URLs base em **um arquivo de configuração central** (os IDs de modelo mudam rápido; vários desta pesquisa são novos).
- O dicionário de termos: usar o campo nativo quando existir (`keywords` OpenAI, `prompt` Groq, `keyterms` ElevenLabs, `keyterm` Deepgram/xAI, `context_bias` Mistral) e também colocar os termos no prompt de limpeza.
- Tratar **400 e 401** como "chave inválida" (Gemini e xAI devolvem 400).
- WAV de 6 min (11,5 MB; ~15,4 MB em base64) cabe em todos os limites: Gemini inline 20 MB, OpenAI 25 MB, Groq 25 MB. Para provedores de 1 chamada, o limite é o da requisição inteira.
- Itens a validar com chave real antes de codar: envio de `keywords`/`languages` no `gpt-transcribe`; `modalities` e resposta de `gpt-audio-1.5`; formato JSON de `input_audio` na Mistral; nome do parâmetro de esforço de raciocínio do `gpt-6-luna` em Chat Completions; `audio/wav` via `inline_data` em `generateContent`.

---

## 10. URLs consultadas (17/10/2026)

Documentação:
- https://developers.openai.com/api/docs/guides/speech-to-text
- https://developers.openai.com/api/docs/guides/audio
- https://developers.openai.com/api/docs/guides/audio-chat-completions
- https://developers.openai.com/api/docs/models
- https://developers.openai.com/api/docs/models/gpt-transcribe
- https://developers.openai.com/api/docs/models/gpt-6-luna
- https://developers.openai.com/api/reference/resources/audio/subresources/transcriptions/methods/create
- https://ai.google.dev/gemini-api/docs/audio
- https://ai.google.dev/gemini-api/docs/openai
- https://ai.google.dev/gemini-api/docs/models
- https://ai.google.dev/gemini-api/docs/interactions
- https://ai.google.dev/api/generate-content
- https://console.groq.com/docs/speech-to-text
- https://console.groq.com/docs/models
- https://openrouter.ai/docs/guides/overview/multimodal/audio
- https://openrouter.ai/api/v1/models?input_modalities=audio&output_modalities=text
- https://docs.mistral.ai/studio/audio/overview
- https://docs.mistral.ai/studio/audio/speech_to_text/offline_transcription
- https://docs.mistral.ai/capabilities/audio/speech_to_text
- https://docs.mistral.ai/api/endpoint/audio/transcriptions
- https://docs.mistral.ai/models
- https://docs.x.ai/docs/models
- https://docs.x.ai/developers/rest-api-reference/inference/voice
- https://api-docs.deepseek.com/quick_start/pricing
- https://elevenlabs.io/docs/api-reference/speech-to-text/convert
- https://elevenlabs.io/docs/overview/capabilities/speech-to-text
- https://developers.deepgram.com/docs/pre-recorded-audio
- https://developers.deepgram.com/docs/models-languages-overview
- https://developers.deepgram.com/docs/keyterm

Requisições de teste com chave falsa (sem áudio), todas em 17/10/2026:
- https://api.openai.com/v1/models, /v1/audio/transcriptions, /v1/chat/completions
- https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent, .../gemini-3.8-flash:generateContent, /v1beta/interactions, /v1beta/openai/chat/completions
- https://api.groq.com/openai/v1/models, /audio/transcriptions, /chat/completions
- https://openrouter.ai/api/v1/chat/completions, /api/v1/key
- https://api.mistral.ai/v1/models, /audio/transcriptions, /chat/completions
- https://api.x.ai/v1/models, /v1/chat/completions, /v1/stt
- https://api.deepseek.com/models, /chat/completions
- https://api.elevenlabs.io/v1/speech-to-text, /v1/models
- https://api.deepgram.com/v1/listen, /v1/projects
