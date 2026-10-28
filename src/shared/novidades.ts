// Novidades de cada versão, mostradas na página "Novidades" do app (a mais nova primeiro).
// REGRA: toda vez que a versão do package.json subir, acrescente a entrada dela AQUI, no topo, com a data
// e o que mudou em linguagem de quem usa (sem termos técnicos). O teste novidades.test.ts falha se faltar.

export interface Novidade {
  versao: string;
  /** AAAA-MM-DD */
  data: string;
  /** Uma frase por mudança, do ponto de vista de quem usa o app. */
  itens: string[];
}

export const NOVIDADES: Novidade[] = [
  {
    versao: "1.1.3",
    data: "2026-10-28",
    itens: [
      "O FalaAi fica só com o ícone na barra de menus, fora do Dock, inclusive ao ligar o Mac. Se preferir o ícone no Dock, ligue em Configurações > Geral > Mostrar no Dock.",
    ],
  },
  {
    versao: "1.1.2",
    data: "2026-10-27",
    itens: [
      "A pílula não some mais depois de dias com o Mac dormindo e acordando: o ditado funcionava, mas ela parava de aparecer.",
      "O cartão de resposta do Pergunte também ficou protegido contra o mesmo problema.",
    ],
  },
  {
    versao: "1.1.1",
    data: "2026-10-20",
    itens: [
      "A IA não completa mais o que você fala nem inventa um texto a partir do que está na tela.",
      "Se a gravação quase não tem fala (um clique, uma respiração), nada é colado.",
      "Se o texto que voltou tem mais palavras do que dá para falar naquele tempo, ele não é colado e a pílula pede para falar de novo.",
      "O aviso \"Não achei um campo de texto aqui\" não aparece mais a cada ditado no Kiro, no VS Code e nos outros editores de código.",
    ],
  },
  {
    versao: "1.1.0",
    data: "2026-10-18",
    itens: [
      "Página Novidades: o que mudou em cada versão, com a data. Depois de atualizar, a pílula avisa.",
      "Esc não perde mais o ditado: a pílula mostra \"Cancelado\" com o botão Desfazer por alguns segundos. Com \"Guardar o áudio\" ligado, o ditado também fica no Histórico como cancelado, para reprocessar depois.",
      "Em apps como Discord, Obsidian e o app do Claude, a IA passa a enxergar o texto em volta do cursor.",
      "Em campos de sites (Gmail, Notion, ChatGPT), o texto antes e depois do cursor também é lido.",
      "Em chats, a IA lê as mensagens em volta da caixa de texto e o texto da janela para acertar nomes e o tom (dá para desligar em Configurações > Dados).",
      "Pergunte: quando o app não informa o texto selecionado, o FalaAi copia a seleção sozinho e devolve a sua área de transferência.",
      "Quando a IA falha, a pílula oferece \"Tentar de novo\" com o mesmo áudio.",
      "Aviso de microfone mudo, aviso de \"demorando mais que o normal\" e contagem regressiva no último minuto antes do limite de 6 minutos.",
      "Se o atalho for apertado com o ditado anterior ainda em andamento, a pílula avisa.",
      "Colou fora de um campo de texto? A pílula avisa e oferece Copiar.",
      "O texto colado não vai mais para o iPhone pela Área de Transferência Universal, e listas ditadas viram listas de verdade no Notas, Mail, Gmail e Notion.",
      "Microfone: o tipo aparece na lista (embutido, Bluetooth, iPhone…), com aviso para microfone Bluetooth e para a tampa do MacBook fechada. Dá para trocar de microfone pelo menu da barra.",
      "Botões extras do mouse podem ser atalho, e as Configurações avisam quando há teclado externo sem a tecla Fn.",
      "Opção de mãos livres com toque duplo, para não começar a gravar sem querer.",
      "Histórico: botão para baixar o áudio do ditado.",
    ],
  },
  {
    versao: "1.0.4",
    data: "2026-10-17",
    itens: [
      "Os números do Início não zeram mais quando você apaga o histórico.",
      "Os números do Início sobem contando ao abrir e quando mudam.",
    ],
  },
  {
    versao: "1.0.3",
    data: "2026-10-17",
    itens: ["Os botões Copiar do Histórico e do cartão de resposta voltaram a copiar."],
  },
  {
    versao: "1.0.2",
    data: "2026-10-17",
    itens: ["Versão também para Mac com processador Intel."],
  },
  {
    versao: "1.0.1",
    data: "2026-10-17",
    itens: [
      "Primeira versão pública.",
      "Tema do clube no app inteiro: menu listrado, faixa no topo e escudo, com as cores certas nas 3 versões da pílula.",
    ],
  },
  {
    versao: "1.0.0",
    data: "2026-10-17",
    itens: [
      "Ditado: segura o Fn, fala, solta, e o texto limpo aparece onde está o cursor.",
      "Pergunte qualquer coisa e Tradução, com idiomas favoritos que trocam durante a gravação.",
      "Contexto do app em foco, Histórico, Dicionário pessoal que aprende com as correções, e Início com estatísticas.",
      "Atalhos livres, inclusive toque duplo, e mãos livres com um toque rápido.",
      "Vários provedores de IA com a sua própria chave, e envio automático (Enter depois de colar).",
      "Pílula em vários estilos, pacote de futebol da Série A e tema claro ou escuro.",
      "Abre só na barra de menus, e o Mac não esquece as permissões a cada versão.",
    ],
  },
];
