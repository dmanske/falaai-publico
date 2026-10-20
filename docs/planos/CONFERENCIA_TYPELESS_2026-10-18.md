# Conferência do Typeless 2.8.2 com o Ghidra (18/10/2026)

Segunda engenharia reversa do Typeless instalado (`/Applications/Typeless.app`, 2.8.2), agora com o **Ghidra
pelo REA** nas 4 bibliotecas nativas (`libKeyboardHelper`, `libContextHelper`, `libInputHelper`,
`libUtilHelper`) e no `macosCheckAccessibility`, mais a leitura do JavaScript da pílula
(`dist/renderer/static/js/DFvLNtQv.mjs`, partes legíveis) e dos 1.030 textos da interface em inglês.
A primeira análise (só o JavaScript) está em [../design/DESIGN_FALAAI.md](../design/DESIGN_FALAAI.md).

O Daniel aprovou fazer **todos** os itens, na sequência proposta abaixo (18/10/2026).
Os relatórios completos dos agentes ficaram na pasta temporária da sessão (some ao reiniciar); o que importa está aqui.
Como repetir a análise (comandos, scripts e regras): [../operacao/ENGENHARIA_REVERSA.md](../operacao/ENGENHARIA_REVERSA.md).

## O que o Typeless faz e o FalaAi não fazia

Evidência: endereço na fatia arm64 descompilada pelo Ghidra, ou valor lido no JavaScript.

| # | Typeless | FalaAi antes | Impacto |
|---|---|---|---|
| 1 | Liga a acessibilidade dos apps Electron/Chromium (`AXEnhancedUserInterface`, `setFocusedWindowEnhancedUserInterface` 0x678c) | Não ligava: em Slack, Discord, Obsidian etc. o campo pode vir vazio | alto |
| 2 | Lê o texto ao redor do cursor por `AXSelectedTextMarkerRange` + `AXStringForTextMarkerRange` quando `AXValue` não existe (campos web: Gmail, Notion, ChatGPT) (`readCurrentInputText` 0x3c50) | Só `AXValue` + `AXSelectedTextRange` | alto |
| 3 | Sem seleção pela Acessibilidade, simula Cmd+C: salva a área de transferência, limpa, Cmd+C, espera 100 ms, lê e restaura (`getSelectedTextBySimulateCopyAsync` 0x8950) | O "pergunte" ficava sem a seleção em Chrome, VS Code, terminal | alto |
| 4 | Em caixa de mensagem (AXTextArea dentro de AXScrollArea), sobe até o "recipiente" e lê ~1.000 caracteres dos irmãos antes e depois = a conversa (`getFocusedElementRelatedContent` 0x8d3c); e até 10.000 caracteres do texto da janela (DFS, profundidade 50, papéis de texto) (`collectVisibleTexts` 0xdfe8) | Só 800 antes / 300 depois dentro do campo | alto |
| 5 | Esc salva a gravação no histórico como `dismissed`, recuperável com "Retry" | Esc descartava o áudio | médio |
| 6 | Nos primeiros 5 s confere se o microfone manda sinal (a cada 100 ms) e avisa "microfone mudo" | Só "Não entendi nenhuma fala" no fim | médio |
| 7 | Depois de colar, se o foco não era editável e o app não está nas listas, oferece copiar o texto (listas: "melhor esforço" = Sublime, WeChat, Excel, WPS, Zed, Google Docs; "sempre gravável" = Cursor, Slack, Mail, Figma, Atlas, Conductor, WezTerm, Thunderbird, LINE) | Colava "no vazio" sem avisar | médio |
| 8 | Prazo da IA 20 s (ditado) / 30 s (pergunte), proporcional ao áudio longo; aviso "demorando mais que o normal" (base + 0,5 s a cada 30 s de áudio + 0,5 s a cada 1.000 caracteres selecionados) | 40 s fixos, sem aviso | médio |
| 9 | Sabe o tipo de cada microfone (Bluetooth/USB/embutido…) e se a tampa do MacBook está fechada (`getAudioDevicesJSON` 0x4c58, `deviceIsLidOpen` 0xc0e4) | Só nome e id | médio |
| 10 | Segurar 600 ms = falar; toque duplo em 400 ms = mãos livres | Toque rápido de 300 ms já liga o mãos livres | baixo/médio |
| 11 | Grava na área de transferência só deste Mac (`prepareForNewContents(.currentHostOnly)`) | `clearContents`: o ditado podia ir para o iPhone pela Área de Transferência Universal | baixo |
| 12 | Procura a tecla V pelo layout do teclado (`findKeyCodeForCharacter` 0x7728) | Código fixo 9 (errado em Dvorak) | baixo |
| 13 | Cola HTML junto com o texto (`insertRichText` 0x6db4) | Só texto | baixo |
| 14 | 9 min de gravação com contagem regressiva no último minuto | 6 min sem aviso | baixo |
| 15 | Reconhece ChatGPT Atlas, Perplexity Comet e DuckDuckGo como navegadores | Não reconhecia | baixo |
| 16 | Botões do mouse (3, 4, 5) como atalho; lista de teclados para saber se há teclado externo sem Fn | Não tinha | baixo |
| 17 | Telas: "tentar de novo" na pílula, aviso "ainda processando o anterior", microfone no menu da barra, baixar o áudio no histórico | Não tinha | baixo |

Onde o FalaAi já era igual ou melhor (fica como está): silenciar o som (guarda o que silenciou), restaurar a área
de transferência só se ninguém copiou nada depois, campo de senha tratado, prazos curtos de Acessibilidade,
toque duplo e mãos livres resolvidos no nativo, religar o monitor de teclado.

## Decisões que diferem do Typeless

- **Limite de gravação continua 6 min**, com contagem regressiva no último minuto. Conta: 9 min × 60 s × 16.000
  amostras × 2 bytes = 17,3 MB de WAV → ~23 MB em base64, acima do limite de ~20 MB por pedido do Gemini. O Typeless
  chega a 9 min porque manda Opus em pedaços.
- **Acessibilidade de apps Electron**: `AXManualAccessibility` (a forma documentada pelo Electron) nos apps com
  `Electron Framework.framework`; `AXEnhancedUserInterface` só em navegador Chromium e só quando o campo não pôde
  ser lido. **Nunca** nos editores de código (VS Code, Kiro, Cursor, Windsurf, Orca): neles pode ligar o "modo leitor
  de tela". Lista em `src/shared/config.ts`. Consequência vista em 20/10/2026: nesses apps o campo nunca é lido, e o
  aviso do item 7 aparecia em todo ditado no Kiro. O Typeless não exclui nenhum app (0x678c só compara com o próprio
  bundle id). Desde a 1.1.1 o aviso não aparece nesses apps
  ([../correcoes/CORRECAO_AVISO_SEM_CAMPO_KIRO_2026-10-20.md](../correcoes/CORRECAO_AVISO_SEM_CAMPO_KIRO_2026-10-20.md)).
- **Microfone mudo**: só avisa com silêncio digital absoluto (amostras exatamente 0) por 5 s. O critério do
  Typeless (byte de 8 bits sem variação) dispara numa sala silenciosa antes de a pessoa falar.
- **Mãos livres por toque duplo**: vira opção; o padrão continua o toque rápido, que é o que o Daniel usa hoje.
- **Texto da janela** (item 4): vai para a IA só com o contexto ligado e tem chave própria nas Configurações,
  porque manda bem mais dados que o campo.
- **Seleção por Cmd+C** (item 3): só quando a Acessibilidade não deu a seleção, com chave nas Configurações.

## Sequência

| Etapa | O que | Estado |
|---|---|---|
| 1 | Auxiliar do Mac, protocolo v4: colar (só este Mac, tecla V pelo layout, HTML), `copiar_selecao`, contexto novo (acessibilidade Electron, marker range, conversa, texto da janela, `editavel`), navegadores, `dispositivos_audio`, `teclados`, botões do mouse | feito em 18/10/2026 (testes automáticos e comandos de leitura; falta uso real) |
| 2 | Não perder ditado: Esc salva como cancelado, microfone mudo, prazo proporcional + "demorando", contagem regressiva, "ainda processando", tentar de novo na pílula, campo não editável, baixar áudio, microfone no menu da barra | feito em 18/10/2026 (testes automáticos e comandos de leitura; falta uso real) |
| 3 | Ligar o protocolo v4 no app: contexto no prompt, seleção por Cmd+C, HTML, rótulos dos microfones, dica de teclado externo, atalhos com mouse, opção do toque duplo | feito em 18/10/2026 (testes automáticos e comandos de leitura; falta uso real) |
| 4 | Documentação (protocolo, módulos, PRD), testes e empacotar | feito: 1.1.0 instalada e publicada (privado + público, release v1.1.0) em 18/10/2026 |

O Windows não ganha os comandos novos nesta rodada (o auxiliar Rust responde "Comando desconhecido" e o app segue sem
eles); fica como pendência.

## Testado pelo Daniel (18/10/2026)

- Esc com "Guardar o áudio" desligado: no começo não havia como recuperar (o "cancelado" só ia para o Histórico com o
  áudio ligado). Virou o botão **Desfazer** na pílula, e funcionou.
- Página **Novidades** e o aviso depois de atualizar: funcionaram.

## O que falta conferir no uso real (18/10/2026)

Nada disto pôde ser testado sem mexer nos apps, no teclado ou na área de transferência do Daniel:
colar (só neste Mac, tecla V, HTML em Notas/Mail/Gmail/Notion); Cmd+C do Pergunte; Esc salvando o cancelado no
Histórico (com o áudio ligado);
microfone mudo; "Tentar de novo" e "Copiar" sem roubar o foco; contagem regressiva; leitura de contexto em apps Electron
(Discord, Obsidian, Claude) e em campos web; botões do mouse; toque duplo; avisos de Bluetooth/tampa; menu
"Microfone" da barra; baixar o áudio.
