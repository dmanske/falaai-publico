# PRD — FalaAi

**Problema:** digitar é lento. Falar é 3–4× mais rápido, mas o ditado comum sai cru (com "é…",
"tipo", sem pontuação) e não sabe onde você está escrevendo.

**Solução:** segura uma tecla, fala, solta. A IA transcreve, limpa e formata conforme o app em foco,
e o texto aparece onde o cursor está. Tudo local, com a chave da Lovable do próprio usuário.

**Para quem:** o Daniel (uso pessoal), no Mac e no Windows.

## Escopo aprovado (17/10/2026)

Aprovados os itens 1–27 da lista de funcionalidades do Typeless, mais Windows. Ficam de fora:
login/conta, sincronização na nuvem, plano/assinatura, banners/pesquisas/convites e telemetria.

| # | Funcionalidade | Fase | Estado |
|---|---|---|---|
| — | Chave da Lovable na tela, criptografada, com botão de teste (texto + áudio) | F0 | ✅ pronto |
| — | Escolha do modelo de IA (lista + id digitado) | F0 | ✅ pronto |
| — | Permissões na tela (microfone, Acessibilidade, aviso da tecla 🌐) | F1 | ✅ pronto |
| 1 | Ditado: segura a tecla, fala, solta, texto colado no cursor | F1 | ✅ pronto (testado pelo Daniel) |
| 2 | Refinar com IA (tira vícios de fala, pontua, organiza) | F1 | ✅ pronto (testado pelo Daniel) |
| 3 | Pílula flutuante (✕, onda simétrica, ✓) no estilo do Typeless | F1 | refeita — falta conferir clique sem perder o foco |
| 4 | Modo mãos livres (toca para começar, toca para parar) | F1 | construído — falta teste com Fn real |
| 5 | Cancelar no meio (Esc) | F1 | construído — falta teste com Fn real |
| 6 | Colar de novo a última transcrição | F1 | construído — falta teste com Fn real |
| 10 | Sons de início e fim | F1 | construído — falta teste com Fn real |
| 11 | Contexto do app em foco (tom/formatação) | F2 | a fazer |
| 12 | Texto ao redor do cursor | F2 | a fazer |
| 13 | "Pergunte qualquer coisa" (comando sobre o texto selecionado / cartão de resposta) | F2 | a fazer |
| 14 | Modo tradução | F2 | a fazer |
| 15 | Idiomas (escolher ou detectar) | F2 | a fazer |
| 7 | Atalhos personalizáveis | F3 | a fazer |
| 8 | Escolher microfone / reserva automática | F3 | a fazer |
| 9 | Silenciar música e vídeo durante o ditado | F3 | a fazer |
| 16 | Dicionário pessoal | F3 | a fazer |
| 17 | Aprender com as correções (adiciona ao dicionário) | F3 | a fazer |
| 18 | Importar dicionário em lote (CSV) | F3 | a fazer |
| 19 | Histórico (busca, copiar, reprocessar) | F3 | a fazer |
| 20 | Guardar o áudio para reprocessar | F3 | a fazer |
| 21 | Limpeza automática do histórico | F3 | a fazer |
| 22 | Estatísticas (palavras, tempo economizado, ppm) | F3 | a fazer |
| 23 | Insights (gráficos por app e por dia) | F3 | a fazer |
| 24 | Configurações gerais (abrir com o sistema, Dock, tema) | F3 | a fazer |
| 25 | Onboarding (permissões, teste de microfone e atalho) | F4 | a fazer |
| 26 | Menu na barra de cima | F0/F4 | básico pronto (Configurações, Sair) |
| 27 | Atualização automática (GitHub Releases) | F4 | a fazer |
| 33 | Windows | F5 | a fazer (teste num PC Windows do Daniel) |
