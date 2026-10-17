# Módulo: Configurações da IA

**Estado:** pronto (F0, 17/10/2026).

## O que faz

Tela de Configurações (aberta ao iniciar o app e pelo ícone da barra de menus) com:
- **Chave da Lovable:** colada no campo, guardada cifrada; a tela só mostra os 4 últimos caracteres.
- **Modelo de IA:** lista de `MODELOS_IA` (`src/shared/config.ts`) ou id digitado à mão. Trocar
  de modelo zera o formato de áudio confirmado (precisa testar de novo).
- **Testar chave:** (1) pede "ok" em texto; (2) manda a amostra de voz e confere se a transcrição
  contém "ditado", tentando os formatos `input_audio` e depois `file`. O formato que funcionou
  fica em `preferencias.formatoAudio` e é o que o ditado vai usar.

## Onde fica

| Parte | Arquivo |
|---|---|
| Chaves (safeStorage) | `src/main/features/chaves/` |
| Preferências | `src/main/features/preferencias/` |
| Chamada à Lovable | `src/main/features/ia/api/lovable.ts` |
| Teste da chave | `src/main/features/ia/testeChave.ts` |
| Tela | `src/renderer/src/features/configuracoes/` |
| Amostra de voz | `resources/amostra-teste.wav` (gerada por `npm run amostra-teste`) |

## Limpeza da chave

A chave passa por `limparChave` ao salvar e ao ler (`features/chaves/lib/limparChave.ts`), porque
costuma vir colada com a linha de baixo do `.env`. Ver
[correção de 17/10/2026](../correcoes/CORRECAO_CHAVE_LOVABLE_COLADA_2026-10-17.md).

## Mensagens de erro do gateway

401/403 → chave recusada · 402 → sem créditos · 404 → modelo não encontrado · 429 → limite ·
tempo esgotado → "A IA demorou demais". O detalhe devolvido pela Lovable vai junto, entre parênteses.

## Verificado em 17/10/2026

- Com chave falsa: salva cifrada no disco e apagada; o gateway voltou "Chave recusada" em 0,4 s.
- Com a chave do Daniel e o Gemini 3 Flash: texto "ok" em 1,2 s; a amostra de áudio transcrita como
  "Teste de ditado: um, dois, três." em 2,2 s, no formato **`input_audio`**. **Caminho A confirmado:**
  o próprio modelo transcreve e refina, sem ElevenLabs.
