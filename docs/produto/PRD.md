# PRD — FalaAi

**Versão do produto:** 1.0.0 (17/10/2026).

**Problema:** digitar é lento. Falar é 3–4× mais rápido, mas o ditado comum sai cru (com "é…",
"tipo", sem pontuação, sem parágrafos) e não sabe onde você está escrevendo.

**Solução:** segura uma tecla, fala, solta. A IA transcreve, limpa e formata conforme o app em foco,
e o texto aparece onde o cursor está. Tudo local, com a chave de IA do próprio usuário: Lovable, Google Gemini,
OpenRouter, OpenAI, Claude (Anthropic), Groq, Mistral ou DeepSeek (`src/shared/provedores.ts`). Quando o modelo
não ouve áudio, um serviço de transcrição separado (OpenAI, Groq, ElevenLabs, Deepgram ou Mistral) faz a
primeira etapa.

**Para quem:** quem mantém o app (uso pessoal do Daniel, no Mac e no Windows) e qualquer pessoa que baixe a
cópia pública e use a própria chave de IA.

## Estado em 17/10/2026

Tudo construído e usado no dia a dia no Mac. Testado de ponta a ponta em modo de teste (`FALAAI_TESTE=1`, sem
colar nos apps do usuário): ditado, tradução com troca de modo, pergunte com cartão, histórico, estatísticas e
dicionário. A Lovable foi testada com chave real; os outros provedores só com chave falsa (respondem "Chave
recusada"). O que depende de tecla física, de som, de chave real ou de Windows está marcado como "falta testar".

## Escopo (17/10/2026)

Aprovados os itens 1–27 da lista de funcionalidades do Typeless, mais Windows, mais o que foi acrescentado
depois (itens com "—" e 33 em diante). Ficam de fora: veja "Fora do escopo".

| # | Funcionalidade | Fase | Estado |
|---|---|---|---|
| — | Chave de IA na tela, criptografada pelo sistema, com botão de teste (texto + áudio) | F0 | ✅ pronto (testado com a Lovable) |
| — | Escolha do modelo de IA (lista do provedor + id digitado), lembrado por provedor | F0 | ✅ pronto |
| — | Vários provedores de IA, chave por provedor, lista do OpenRouter e serviço de transcrição (ver modulos/configuracoes-ia.md) | — | construído — Lovable testada; os outros provedores e serviços precisam de chave real |
| — | Envio automático: Enter depois do ditado, por voz ("manda") ou por app (ver modulos/envio-automatico.md) | — | construído — falta testar o Enter ao vivo |
| — | Marca FalaAi: F de duas curvas, ícone do app na grade do macOS e ícone da barra de menus (só o F) | — | ✅ pronto (no .app só depois de empacotar de novo) |
| — | Permissões na tela (microfone, Acessibilidade, aviso da tecla 🌐) | F1 | ✅ pronto |
| — | Instalável no Mac (FalaAi.app / .dmg, arm64) com assinatura fixa "FalaAi Local", para o macOS não esquecer a Acessibilidade a cada versão (ver operacao/ASSINATURA_MAC.md) | F5 | construído — falta conferir a permissão sobrevivendo a uma reinstalação; sem notarização da Apple |
| — | "Criado por Daniel Manske" + marca da última atualização (muda a cada build) | — | ✅ pronto |
| 1 | Ditado: segura a tecla, fala, solta, texto colado no cursor | F1 | ✅ pronto (usado pelo Daniel) |
| 2 | Refinar com IA (tira vícios de fala, pontua, organiza) | F1 | ✅ pronto (usado pelo Daniel) |
| 3 | Pílula flutuante (✕, onda simétrica, ✓) no estilo do Typeless | F1 | ✅ pronto — conferir clique no ✓/✕ sem perder o foco |
| — | Estilos da pílula: 7 gerais + pacote de futebol (20 clubes da Série A 2026, 3 variantes, escudo) (ver modulos/pilula-estilos.md) | — | construído — falta ver a pílula dos clubes durante um ditado real |
| — | Tema do clube no app: destaque, menu lateral com o padrão da camisa, faixa no topo e escudo | — | construído — modo escuro do tema do clube ainda sem revisão visual |
| 4 | Modo mãos livres (toca para começar, toca para parar) | F1 | construído — falta testar com Fn físico |
| 5 | Cancelar no meio (Esc) | F1 | construído — falta testar com Esc físico |
| 6 | Colar de novo a última transcrição | F1 | construído — falta testar Ctrl+Cmd+V físico |
| 10 | Sons de início e fim | F1 | construído — conferir o som |
| 11 | Contexto do app em foco (tom/formatação) | F2 | ✅ pronto (app em foco detectado: Kiro) |
| 12 | Texto ao redor do cursor | F2 | construído — conferir continuação de frase |
| 13 | "Pergunte qualquer coisa" (comando sobre o texto selecionado / cartão de resposta) | F2 | ✅ testado em modo de teste (cartão); com seleção falta testar ao vivo |
| 14 | Modo tradução | F2 | ✅ testado em modo de teste |
| 15 | Idiomas (escolher ou detectar) e **idiomas favoritos da tradução** (até 4, troca durante a gravação com ⇧ ou clicando na sigla da pílula) | F2 | construído (idiomas vão no prompt) — falta testar a troca com a tecla física |
| 7 | Atalhos livres: combinações de teclas e toque duplo, com validação (ver design/PROTOCOLO_AUXILIAR.md) | F3 | construído — conferir a gravação de atalhos e o toque duplo com teclado físico |
| 8 | Escolher microfone / reserva automática | F3 | construído — conferir lista de microfones |
| 9 | Silenciar música e vídeo durante o ditado | F3 | construído — NÃO testado (mexe no som do Mac) |
| 16 | Dicionário pessoal | F3 | ✅ pronto (Lovable, Supabase, Manske, FalaAi cadastrados) |
| 17 | Aprender com as correções (adiciona ao dicionário) | F3 | construído — conferir ao vivo |
| 18 | Importar dicionário em lote (CSV) | F3 | construído |
| 19 | Histórico (busca, copiar, reprocessar) | F3 | ✅ pronto (testado) |
| 20 | Guardar o áudio para reprocessar | F3 | ✅ pronto |
| 21 | Limpeza automática do histórico | F3 | construído |
| 22 | Estatísticas (palavras, tempo economizado, ppm) | F3 | ✅ pronto (testado) |
| 23 | Insights (gráficos por app e por dia) | F3 | ✅ pronto (calendário e apps mais usados) |
| 24 | Configurações gerais: abrir com o sistema, **iniciar só na barra de menus** (padrão; a janela não abre sozinha), Dock, tema claro/escuro/sistema com botão de troca rápida no menu, fundo (ondas no topo, completo ou nenhum) | F3 | construído |
| 25 | Onboarding (permissões, teste de microfone e atalho) | F4 | ✅ pronto (6 passos; concluído) |
| 26 | Menu na barra de cima | F0/F4 | ✅ pronto |
| 27 | Atualização automática (GitHub Releases) | F4 | construído — procura em `dmanske/falaai-publico` (`REPO_ATUALIZACOES`); falta testar quando houver uma versão publicada lá |
| 33 | Windows | F5 | construído (auxiliar Rust + instalador pelo GitHub Actions, sem assinatura) — **não testado em um PC Windows** |
| 34 | Identidade visual: logo, fonte Fredoka, fundo com ondas escolhível, logos dos provedores e bandeiras nos idiomas (ver design/DESIGN_SYSTEM.md) | F5 | ✅ pronto |
| 35 | Formatação do ditado: pausas, fala rápida, listas e tópicos (ritmo medido no Mac + regras no prompt) | F5 | construído — falta testar com a IA de verdade ([módulo](../modulos/formatacao-ditado.md)) |
| — | Idiomas misturados: o ditado mantém cada trecho no idioma falado e não executa pedidos ditados (ver correcoes/) | — | ✅ pronto — corrigido em 17/10/2026 |
| — | Chave colada com a linha do `.env` junto é limpa ao salvar e ao ler (`limparChave`) | — | ✅ pronto — corrigido em 17/10/2026 |

## Fora do escopo

- Login ou conta de usuário.
- Sincronização na nuvem: o histórico, o dicionário e as chaves ficam só no computador.
- Plano ou assinatura paga.
- Banners, pesquisas e convites.
- Telemetria: a única saída para a internet é a IA escolhida pelo usuário (e a consulta de atualizações e da lista
  de modelos do OpenRouter).

## Pendências

- **Windows** não testado em um PC Windows (o instalador sai do GitHub Actions, sem assinatura).
- **Transcrição com chaves reais** dos outros provedores e serviços (só a Lovable foi testada de ponta a ponta).
- **Modo escuro do tema do clube**: falta revisar visualmente.
- **Pílula dos clubes durante um ditado real**: conferida só nas miniaturas e em prints.
- **Notarização da Apple**: o app é assinado com certificado local; em outro Mac o Gatekeeper avisa na primeira
  abertura.
- Teclas físicas (mãos livres, Esc, colar a última, toque duplo), o Enter do envio automático e a atualização
  automática a partir da cópia pública, como marcado na tabela.

## Repositórios

Privado `dmanske/falaai-oficial` (desenvolvimento) e cópia pública `dmanske/falaai-publico`, onde o app procura
atualizações. Os escudos dos clubes são marcas registradas, mantidos para uso pessoal (ver `assets/LICENCAS.md`).
