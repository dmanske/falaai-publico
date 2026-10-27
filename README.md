# FalaAi

Ditado por voz com IA, 100% local: segura a tecla, fala, solta, e o texto já limpo aparece onde
o cursor está. Inspirado nas funcionalidades do Typeless, com código próprio.

- **App:** Electron + React + TypeScript (electron-vite), Mac e Windows. Versão 1.1.2 (o que mudou em cada versão: página **Novidades** do app, `src/shared/novidades.ts`).
- **IA com a sua chave:** Lovable, Google Gemini, OpenRouter, OpenAI, Claude (Anthropic), Groq,
  Mistral ou DeepSeek, colada na tela de Configurações e guardada criptografada pelo sistema.
  Quando o modelo não ouve áudio, um serviço de transcrição (OpenAI, Groq, ElevenLabs, Deepgram,
  Mistral) faz a primeira etapa. Sem servidor, sem conta, sem nuvem, sem telemetria.

## O que faz

- Ditado (segura a tecla, fala, solta), mãos livres, tradução por voz e "pergunte qualquer coisa".
- A IA limpa o texto, entende listas faladas, tópicos, pausas e mudanças de assunto, e respeita
  português com termos em inglês.
- Envio automático (Enter) por comando de voz ou por app; atalhos livres, inclusive toque duplo.
- Contexto do app em foco: texto em volta do cursor (inclusive em apps Electron e campos de sites), a conversa em
  volta da caixa de texto e o texto da janela, para acertar nomes e o tom.
- Pílula que avisa e recupera: Desfazer depois do Esc, Tentar de novo quando a IA falha, microfone mudo, "demorando",
  contagem regressiva, e Copiar quando não há campo de texto.
- Histórico, estatísticas, dicionário pessoal que aprende com as correções, e a página Novidades.
- Visual: fonte Fredoka, fundo com ondas, pílula com 7 estilos e pacote de futebol (20 clubes da
  Série A 2026, com o tema do clube no app inteiro).

> Os escudos dos clubes são marcas registradas dos clubes e estão aqui para uso pessoal; a origem e a
> licença de cada arquivo estão em [`src/renderer/src/assets/LICENCAS.md`](src/renderer/src/assets/LICENCAS.md).

## Rodar

```bash
npm install
npm run nativo:mac # compila o auxiliar nativo do Mac (teclado e colar)
npm run dev        # desenvolvimento, com recarga
npm run build      # compila para out/
npm start          # roda o compilado
npm run typecheck
npm test           # testes unitários (node --test)
npm run empacotar:mac   # FalaAi.app e .dmg em release/
```

No Mac, para o sistema não esquecer a permissão de Acessibilidade a cada versão, crie uma vez o
certificado local de assinatura: `bash scripts/criar-assinatura-mac.sh`
(ver [`docs/operacao/ASSINATURA_MAC.md`](docs/operacao/ASSINATURA_MAC.md)).

> Rodando de dentro da extensão do Claude no VS Code, a variável `ELECTRON_RUN_AS_NODE=1` vem
> herdada e faz o Electron rodar como Node puro. Os scripts `dev` e `start` já a removem.

## Onde está cada coisa

Ver [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) e o índice [`docs/README.md`](docs/README.md).

Criado por Daniel Manske.
