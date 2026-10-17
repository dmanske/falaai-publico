# Design do FalaAi

> Documento histórico (17/10/2026), escrito quando o app só falava com a Lovable. Hoje há 8 provedores de IA e 5 serviços de transcrição (ver [../modulos/configuracoes-ia.md](../modulos/configuracoes-ia.md)); a tabela de decisões e as fases abaixo descrevem o ponto de partida. O visual está em [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).

**Data:** 17/10/2026. **Base:** engenharia reversa do Typeless 2.8.2 instalado
(`/Applications/Typeless.app`) com o REA (MCP) e leitura do pacote. Serve como referência de
funcionalidades e arquitetura; **nenhum código, ícone, som ou servidor do Typeless é reutilizado**.

## 1. O que o Typeless é por dentro (observado)

Evidência REA da análise do `app.asar`: `ev_f594ac7daac08a86242c12d64b4657f7548b7587957bbe08a0de8d1a433a54db`
(análise estática; não houve captura em execução).

- **Electron + React**, processo principal ofuscado (obfuscator.io); 9.608 strings recuperadas
  decodificando a tabela de strings.
- **Janelas:** `floating-bar` (pílula), `hub` (principal), `interactive-card` (resposta do
  "pergunte"), `sidebar`, `login`, `onboarding`.
- **Bibliotecas nativas em Swift**, chamadas via `koffi`:

| Biblioteca | Exporta |
|---|---|
| `libKeyboardHelper` | `startMonitor`, `stopMonitor`, `updateTargetShortcuts`, `processEvents`, `getKeyboardDeviceList` |
| `libContextHelper` | `getFocusedAppInfoAsync`, `getFocusedElementInfoAsync`, `getFocusedVisibleTextAsync`, `getFocusedElementRelatedContentAsync` |
| `libInputHelper` | `insertText`, `insertRichText`, `getSelectedText`, `getSelectedTextBySimulateCopyAsync`, `deleteBackward` |
| `libUtilHelper` | `getAudioDevicesJSON`, `muteAudio`, `unmuteAudio`, `isAudioMuted`, `checkAccessibilityPermission` |

- **Colar:** guarda a área de transferência, grava o texto como `org.nspasteboard.TransientType`,
  simula Cmd+V (`simulatePasteCommand`) e restaura.
- **Áudio:** `getUserMedia` + AudioWorklet na tela, comprimido em Opus/OGG (workers + `libopusenc`).
- **Requisição principal:** `POST /ai/voice_flow` (multipart, tempo limite de 40 s) com `audio_file`
  (OGG), `mode` (`transcript` | `ask_anything` | `translation`), `audio_context` (cifrado com RSA),
  `audio_metadata`, `parameters` (`selected_text` ou `output_language`), `device_name`.
  Resposta: `refine_text`, `delivery`, `web_metadata`, `external_action`.
- **Contexto enviado:** app (`app_name`, `app_identifier`, `window_title`, `app_type`,
  `visible_screen_content`, `browser_context`) e campo em foco (`input_area_type`,
  `accessibility_role`, texto antes/depois do cursor, texto selecionado).
- **Atalhos padrão:** Mac → ditado `Fn`, pergunte `Fn+Space`, tradução `Fn+LeftShift`, colar a
  última `Ctrl+Cmd+V`. Windows → `RightAlt`, `RightAlt+Space`, `RightAlt+RightShift`,
  `LeftCtrl+RightShift+V`.
- **Banco local:** SQLite (drizzle, 14 migrações), tabelas `history`/`history_v2`.
- **Não observável no pacote:** qual serviço transcreve, qual modelo refina e os prompts — tudo
  roda no servidor deles.

## 2. Decisões do FalaAi

| Decisão | Escolha | Alternativa descartada |
|---|---|---|
| Plataforma | Electron + React + TS (electron-vite) | Swift nativo (só Mac) |
| Dados | 100% local | Supabase |
| IA | Chave Lovable do usuário, gateway OpenAI-compatível | Backend próprio |
| Transcrição | **A:** o modelo (Gemini) recebe o áudio e já devolve refinado, numa chamada | **B (reserva):** ElevenLabs transcreve + Lovable refina |
| Formato do áudio | WAV 16 kHz mono (base64) | Opus/OGG — exigiria encoder; Gemini aceita WAV |
| Nativo | Processo auxiliar separado (Swift no Mac, Rust no Windows), JSON por stdin/stdout | Biblioteca dentro do Electron via koffi (se travar, derruba o app) |
| Chaves | `safeStorage` (Keychain/DPAPI) | `.env` ou arquivo em texto |
| Atualização | electron-updater + GitHub Releases | Servidor próprio |

**A ou B** é decidido pelo botão "Testar chave": ele manda `resources/amostra-teste.wav` ("Teste de
ditado, um, dois, três.") nos formatos `input_audio` e `file` e guarda o que funcionou em
`preferencias.formatoAudio`.

**Resultado (17/10/2026): caminho A confirmado.** Gemini 3 Flash pela Lovable transcreveu a amostra
em 2,2 s com `input_audio` (WAV em base64). O caminho B fica só como reserva, se um dia precisar.

## 3. Fases

| Fase | Entrega | Itens do PRD |
|---|---|---|
| F0 | Base, bandeja, Configurações com chave/modelo/teste | — |
| F1 | Núcleo no Mac: Fn → grava → IA → cola. Pílula, mãos livres, Esc, colar a última, sons | 1–6, 10 |
| F2 | Contexto do app e do cursor, pergunte, tradução, idiomas | 11–15 |
| F3 | Janela principal: histórico, dicionário, estatísticas, insights, atalhos, microfone, silenciar fundo, gerais | 7–9, 16–24 |
| F4 | Onboarding, menu da barra completo, atualização automática | 25–27 |
| F5 | Windows (auxiliar em Rust, instalador pelo GitHub Actions; teste no PC Windows do Daniel) | 33 |
