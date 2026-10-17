# PRD — FalaAi

**Problema:** digitar é lento. Falar é 3–4× mais rápido, mas o ditado comum sai cru (com "é…",
"tipo", sem pontuação) e não sabe onde você está escrevendo.

**Solução:** segura uma tecla, fala, solta. A IA transcreve, limpa e formata conforme o app em foco,
e o texto aparece onde o cursor está. Tudo local, com a chave da Lovable do próprio usuário.

**Para quem:** o Daniel (uso pessoal), no Mac e no Windows.

## Estado em 17/10/2026

Tudo construído. Testado de ponta a ponta em modo de teste (`FALAAI_TESTE=1`, sem colar nos apps do
usuário): ditado, tradução com troca de modo, pergunte com cartão, histórico, estatísticas e dicionário.
O Daniel já usa o app no dia a dia (ditados reais no Kiro). O que depende de tecla física, de som ou
de Windows está marcado como "falta testar".

## Escopo aprovado (17/10/2026)

Aprovados os itens 1–27 da lista de funcionalidades do Typeless, mais Windows. Ficam de fora:
login/conta, sincronização na nuvem, plano/assinatura, banners/pesquisas/convites e telemetria.

| # | Funcionalidade | Fase | Estado |
|---|---|---|---|
| — | Chave da Lovable na tela, criptografada, com botão de teste (texto + áudio) | F0 | ✅ pronto |
| — | Escolha do modelo de IA (lista + id digitado) | F0 | ✅ pronto |
| — | Permissões na tela (microfone, Acessibilidade, aviso da tecla 🌐) | F1 | ✅ pronto |
| — | Instalável no Mac (FalaAi.app / .dmg, assinatura ad-hoc) | F5 | ✅ gerado e verificado; não aberto |
| — | "Criado por Daniel Manske" + marca da última atualização (muda a cada build) | — | ✅ pronto |
| 1 | Ditado: segura a tecla, fala, solta, texto colado no cursor | F1 | ✅ pronto (usado pelo Daniel) |
| 2 | Refinar com IA (tira vícios de fala, pontua, organiza) | F1 | ✅ pronto (usado pelo Daniel) |
| 3 | Pílula flutuante (✕, onda simétrica, ✓) no estilo do Typeless | F1 | ✅ pronto — conferir clique no ✓/✕ sem perder o foco |
| 4 | Modo mãos livres (toca para começar, toca para parar) | F1 | construído — falta testar com Fn físico |
| 5 | Cancelar no meio (Esc) | F1 | construído — falta testar com Esc físico |
| 6 | Colar de novo a última transcrição | F1 | construído — falta testar Ctrl+Cmd+V físico |
| 10 | Sons de início e fim | F1 | construído — conferir o som |
| 11 | Contexto do app em foco (tom/formatação) | F2 | ✅ pronto (app em foco detectado: Kiro) |
| 12 | Texto ao redor do cursor | F2 | construído — conferir continuação de frase |
| 13 | "Pergunte qualquer coisa" (comando sobre o texto selecionado / cartão de resposta) | F2 | ✅ testado em modo de teste (cartão); com seleção falta testar ao vivo |
| 14 | Modo tradução | F2 | ✅ testado em modo de teste |
| 15 | Idiomas (escolher ou detectar) | F2 | construído (idiomas vão no prompt) |
| 7 | Atalhos personalizáveis | F3 | construído — conferir a gravação de atalhos |
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
| 24 | Configurações gerais (abrir com o sistema, Dock, tema) | F3 | construído |
| 25 | Onboarding (permissões, teste de microfone e atalho) | F4 | ✅ pronto (6 passos; concluído) |
| 26 | Menu na barra de cima | F0/F4 | ✅ pronto |
| 27 | Atualização automática (GitHub Releases) | F4 | construído — o repositório privado impede a verificação; ver docs/planos |
| 33 | Windows | F5 | construído (auxiliar Rust + instalador pelo GitHub Actions) — falta testar no PC Windows |
