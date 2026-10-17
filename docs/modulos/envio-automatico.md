# Módulo: Envio automático (Enter depois do ditado)

**Estado:** construído (17/10/2026). Lógica e testes unitários prontos; o Enter real não foi
testado por mim (precisa de foco num app de verdade).

## O que faz

Depois de colar o ditado, o FalaAi aperta Enter sozinho para mandar a mensagem. Duas formas:

- **Por voz** (ligado por padrão, `preferencias.enviarPorVoz`): terminar a fala com "enviar",
  "envia", "envie", "manda", "mandar", "pode enviar", "pode mandar", "send" ou "send it". O comando
  sai do texto colado ("…tudo certo, manda" → "…tudo certo." + Enter). Só vale no fim da fala,
  depois de pontuação ou vírgula, para não pegar "manda" no meio da frase.
- **Por app** (`preferencias.enviarNosApps`): em Configurações > Envio automático, liga-se o envio
  sempre num app (a lista vem do histórico, com o selo "comum" no mais usado).

Não vale no modo "pergunte". Com o envio ligado, o FalaAi não observa a edição do texto (não há o
que aprender depois que a mensagem saiu).

## Onde fica

| Parte | Arquivo |
|---|---|
| Detectar e tirar o comando | `src/main/features/ditado/lib/comandoEnviar.ts` (+ `.test.ts`) |
| Decidir e apertar Enter | `src/main/features/ditado/index.ts` (`ESPERA_ENTER_MS` = 180 ms após colar) |
| Enter no Mac | `nativo/macos/main.swift` → `apertarEnter()` (Return, tecla 36; exige Acessibilidade) |
| Enter no Windows | `nativo/windows/src/sistema/teclado.rs` → `apertar_enter()` (VK 0x0D) |
| Protocolo | comando `apertar_enter` em [PROTOCOLO_AUXILIAR.md](../design/PROTOCOLO_AUXILIAR.md) |
| Tela | `src/renderer/src/features/configuracoes/components/secoes/SecaoEnvio.tsx` |

## Falta testar

Ditado real terminando em "manda" num chat (WhatsApp, Slack, caixa do Claude) e um app com o envio
sempre ligado. No Windows, depois do build pelo GitHub Actions.
