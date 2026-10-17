# Módulo: Ditado (F1)

**Estado:** construído em 17/10/2026. O fluxo com tecla física e microfone real ainda **aguarda o
teste do Daniel** (ver "Verificado").

## Como usa

| Ação | Mac |
|---|---|
| Ditar | Segurar **Fn**, falar, soltar |
| Mãos livres | Toque rápido em Fn (menos de 0,3 s); o próximo toque para |
| Cancelar | Esc |
| Colar a última de novo | Ctrl+Cmd+V |
| Fn usada como modificador (Fn+Delete, Fn+F5…) | Cancela sozinho, sem som de erro |

Pré-requisitos: microfone e Acessibilidade liberados, e em Ajustes > Teclado a opção "Pressionar
tecla 🌐 para" em **Não fazer nada**. A tela de Configurações mostra os três e abre os Ajustes certos.

## Fluxo

1. O auxiliar nativo (`resources/bin/falaai-auxiliar-mac`, código em `nativo/macos/main.swift`) lê o
   teclado (CGEventTap só de leitura) e manda `fn desce/sobe`, `fn_combinado`, `esc` e
   `colar_ultima` em JSON.
2. `src/main/features/ditado/index.ts` (máquina de estados: ocioso → gravando → processando):
   mostra a pílula e manda a pílula gravar.
3. A pílula (`src/renderer/src/features/pilula/`) grava com MediaRecorder, mostra a onda e, ao parar,
   converte para **WAV 16 kHz mono** (`lib/wav.ts`) e devolve ao processo principal.
4. `features/ia/transcrever.ts` manda o áudio para a Lovable com `PROMPT_DITADO`
   (`features/ia/prompts.ts`): transcreve e limpa numa chamada só.
5. O auxiliar cola o texto: guarda a área de transferência, grava o texto como transitório,
   simula Cmd+V e restaura depois de 450 ms. Duas colagens seguidas preservam o original do usuário.
6. Se não conseguir colar, o texto fica na área de transferência e a pílula avisa para colar com Cmd+V.

A pílula é um painel que **não ativa o app** (`type: "panel"`, `focusable: false`, `showInactive`),
para o texto cair no app onde o usuário estava. O microfone só é liberado para ela.

## Valores ajustáveis

`src/shared/config.ts`: `TOQUE_RAPIDO_MS` (300), `GRAVACAO_MINIMA_MS` (400), `GRAVACAO_MAXIMA_S` (360),
`JANELA_FN_COMBINADO_MS` (800), `TAXA_AMOSTRAGEM` (16000), `ERRO_PILULA_MS` (3500), `VOLUME_SONS` (0,12).
Sons ligados por padrão (`preferencias.sons`). A chave para desligar entra na tela na F3.

## Compilar o auxiliar

`npm run nativo:mac` gera um binário universal (arm64 + x86_64). Não vai para o git (`resources/bin/`).

## Verificado em 17/10/2026

- Auxiliar: protocolo (pronto, permissões, erro de comando e de JSON, sair, EOF) e o binário universal.
- No app rodando: Acessibilidade = sim; teclado ativo = sim; tecla 🌐 detectada como "ditado da Apple"
  (aviso aparece); microfone ainda não pedido.
- Gravação e conversão na pílula, com o microfone trocado por um tom sintético: 1,5 s gravados
  viraram um WAV de 1,32 s, 16 kHz, mono, 16 bits, com 42.284 bytes
  (44 + 1,32 s × 32.000 bytes/s).
- Pílula nos estados gravando (mãos livres), processando e erro: conferida por print.
- Transcrição com o prompt de limpeza: a amostra voltou como "Teste de ditado. 1, 2, 3." em 2,4 s.
- **Não verificado ainda:** Fn físico, microfone real, colar num app de verdade e Esc/Ctrl+Cmd+V físicos.

## Incidente no desenvolvimento (17/10/2026)

Num teste do auxiliar, o agente executou `colar` de verdade, achando que daria erro de permissão; o
terminal tinha Acessibilidade. A área de transferência do Daniel ficou com "x", o conteúdo anterior se
perdeu, e um Cmd+V foi simulado no app em foco. Correção: `sair`/EOF passaram a restaurar a área de
transferência antes de encerrar. Regra: não testar `colar` sem combinar antes.
