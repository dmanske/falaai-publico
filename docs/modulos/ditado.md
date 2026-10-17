# Módulo: Ditado (F1)

**Estado:** funcionando (17/10/2026). O Daniel ditou "Alô, testando." segurando Fn e o texto foi colado.
Ainda não conferidos: mãos livres, Esc, Ctrl+Cmd+V e o clique nos botões da pílula.

## Como usa

| Ação | Mac (padrão) | Windows (padrão) |
|---|---|---|
| Ditar | Segurar **Fn**, falar, soltar | Segurar **Alt direito** |
| Pergunte qualquer coisa | Fn + Espaço | Alt direito + Espaço |
| Traduzir | Fn + Shift esquerdo | Alt direito + Shift direito |
| Mãos livres | Toque rápido na tecla do ditado (menos de 0,3 s); o próximo toque para | igual |
| Cancelar | Esc | Esc |
| Colar a última de novo | Ctrl+Cmd+V | Ctrl esquerdo + Shift direito + V |
| Fn usada como modificador (Fn+Delete, Fn+F5…) | Cancela sozinho, sem som de erro | não se aplica |

Os atalhos são livres: em Configurações > Atalhos dá para gravar outra combinação ou um **toque duplo**
(tocar uma tecla duas vezes rápido). Valores padrão e regras de validação em `src/shared/atalhos.ts`. O
Windows ainda não foi testado num PC Windows.

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
4. `features/ia/transcrever.ts` entrega o áudio ao motor de IA (`features/ia/motor.ts`) com `PROMPT_DITADO`
   (`features/ia/prompts.ts`). Com um modelo que ouve áudio (Lovable, Gemini, OpenRouter, Mistral), transcreve e
   limpa numa chamada só; nos demais, um serviço de transcrição faz a primeira etapa (ver
   [configuracoes-ia.md](configuracoes-ia.md)). O bloco "Ritmo da fala" vai junto
   ([formatacao-ditado.md](formatacao-ditado.md)). Se a fala terminar com "manda"/"enviar", o Enter é apertado
   depois de colar ([envio-automatico.md](envio-automatico.md)).
5. O auxiliar cola o texto: guarda a área de transferência, grava o texto como transitório,
   simula Cmd+V e restaura depois de 450 ms. Duas colagens seguidas preservam o original do usuário.
6. Se não conseguir colar, o texto fica na área de transferência e a pílula avisa para colar com Cmd+V.

A pílula é um painel que **não ativa o app** (`type: "panel"`, `focusable: false`, `showInactive`,
`acceptFirstMouse`), para o texto cair no app onde o usuário estava. O microfone só é liberado para ela.

Visual (referência `docs/design/referencias/typeless-pilula.png`): pílula preta com **✕** à esquerda
(cancelar; também cancela durante o "processando"), **onda simétrica** mais alta no meio e **✓** à direita
(terminar e colar). A janela tem o tamanho exato da pílula: 144×38 (188×38 na tradução, 300×38 em erro ou aviso; mais 26 px
com o escudo de um clube), a 20 px acima do Dock. Estilos, clubes e cores:
[pilula-estilos.md](pilula-estilos.md) e [../design/DESIGN_SYSTEM.md](../design/DESIGN_SYSTEM.md).

## Valores ajustáveis

`src/shared/config.ts`: `TOQUE_RAPIDO_MS` (300), `GRAVACAO_MINIMA_MS` (400), `GRAVACAO_MAXIMA_S` (360),
`JANELA_FN_COMBINADO_MS` (800), `TAXA_AMOSTRAGEM` (16000), `ERRO_PILULA_MS` (3500), `VOLUME_SONS` (0,12).
Sons ligados por padrão (`preferencias.sons`).

## Iniciar só na barra de menus

Depois do onboarding, o FalaAi **não abre a janela sozinho**: fica só com o ícone na barra de menus (Mac) ou na
bandeja (Windows), e o ditado já funciona. A preferência é `abrirJanelaAoIniciar` (padrão desligada), em
Configurações > Geral > "Abrir a janela ao iniciar". Fechar a janela também não encerra o app; para sair, use
"Sair do FalaAi" no menu do ícone (`src/main/index.ts`, `src/main/bandeja.ts`).

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
- **Teste do Daniel:** o primeiro ditado deu "Não entendi nenhuma fala". Causa: o tom sintético do meu
  teste continuava no lugar do microfone. Depois de recarregar a pílula: "Alô, testando." colado certo.
- **Não verificado ainda:** mãos livres, Esc, Ctrl+Cmd+V e o clique nos botões ✕/✓ (o foco tem que continuar no app).

## Incidente no desenvolvimento (17/10/2026)

Num teste do auxiliar, o agente executou `colar` de verdade, achando que daria erro de permissão; o
terminal tinha Acessibilidade. A área de transferência do Daniel ficou com "x", o conteúdo anterior se
perdeu, e um Cmd+V foi simulado no app em foco. Correção: `sair`/EOF passaram a restaurar a área de
transferência antes de encerrar. Regra: não testar `colar` sem combinar antes.
