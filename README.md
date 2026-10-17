# FalaAi

Ditado por voz com IA, 100% local: segura a tecla, fala, solta, e o texto já limpo aparece onde
o cursor está. Inspirado nas funcionalidades do Typeless, com código próprio.

- **App:** Electron + React + TypeScript (electron-vite), Mac e Windows.
- **IA:** a chave da Lovable do próprio usuário (gateway `ai.gateway.lovable.dev`), colada na
  tela de Configurações. Sem servidor, sem conta, sem nuvem.

## Rodar

```bash
npm install
npm run dev        # desenvolvimento, com recarga
npm run build      # compila para out/
npm start          # roda o compilado
npm run typecheck
npm test           # testes unitários (node --test)
```

> Rodando de dentro da extensão do Claude no VS Code, a variável `ELECTRON_RUN_AS_NODE=1` vem
> herdada e faz o Electron rodar como Node puro. Os scripts `dev` e `start` já a removem.

## Onde está cada coisa

Ver [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) e o índice [`docs/README.md`](docs/README.md).
