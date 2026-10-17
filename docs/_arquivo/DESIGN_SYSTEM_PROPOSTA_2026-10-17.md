> **Arquivado em 17/10/2026: proposta de design system que o dono não aprovou e que não foi adotada** (Nunito Sans e outra paleta). O design system real do app está em [../design/DESIGN_SYSTEM.md](../design/DESIGN_SYSTEM.md).

# FalaAi — Design System

Versão 1.0 · 17 de outubro de 2026

## Direção

Uma interface clara, tranquila e rápida para transformar fala em texto. Base branca, tipografia preta, superfícies discretas e azul reservado a ações e estados ativos. Este documento é uma proposta de padronização baseada na captura do aplicativo e na marca criada nesta conversa; cores e medidas não foram extraídas do código existente.

## Marca

- Nome: **FalaAi**. Manter essa capitalização.
- Frase oficial: **Fale, não digite.**
- Símbolo: F abstrato formado por duas curvas, conforme a proposta escolhida como base nesta conversa.
- Assinatura principal: símbolo + FalaAi na horizontal.
- Assinatura institucional: símbolo acima da frase oficial.
- Ícone do aplicativo: símbolo preto sobre base branca com cantos arredondados; sem texto.
- A captura atual usa outro símbolo na barra lateral. Substituí-lo pelo F para unificar a identidade.

### Regras de aplicação

Usar preto sobre fundos claros e branco sobre fundos escuros. Preservar proporções e a abertura entre as duas curvas. Reservar ao redor do conjunto uma margem mínima equivalente a 25% da largura do símbolo. Não esticar, rotacionar, contornar nem adicionar efeitos ao símbolo plano. O relevo discreto fica restrito ao ícone do sistema operacional.

Tamanhos mínimos propostos: símbolo isolado 20 px; assinatura horizontal 120 px; assinatura com frase 240 px. Em 16 px, usar uma versão óptica simplificada, a validar no app. Abaixo do tamanho mínimo da assinatura, usar apenas o símbolo.

Os PNGs gerados são referências visuais. Para a marca definitiva, redesenhar o símbolo em SVG e compor os textos com a fonte real; a geração por IA não garante curvas ou letras idênticas entre imagens.

## Tipografia

**Fonte proposta: Nunito Sans**, com fallback `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.

A imagem gerada não usou uma fonte identificável. Nunito Sans é a escolha de implementação proposta, aproximando as formas suaves da referência, sem promessa de correspondência exata.

| Uso | Tamanho / entrelinha | Peso |
| --- | --- | --- |
| Título principal | 40 / 48 px | 800 |
| Título de seção | 24 / 32 px | 700 |
| Título de card | 18 / 26 px | 700 |
| Corpo e navegação | 16 / 24 px | 400 ou 600 |
| Rótulo de campo e botão | 14 / 20 px | 600 |
| Legenda | 12 / 18 px | 400 |
| Número de indicador | 40 / 44 px | 800 |

Aplicar números tabulares nos indicadores. Unidades como min e PPM devem ter tamanho menor e rótulo explicativo. Não usar texto menor que 12 px em informações necessárias. Na marca, usar peso 800 e ajustar o espaçamento das letras visualmente.

## Cores

| Token | Valor | Uso |
| --- | --- | --- |
| `background` | `#FFFFFF` | Fundo principal |
| `surface` | `#F5F5F7` | Barra lateral e áreas secundárias |
| `surface-hover` | `#EBEBEF` | Hover em controles neutros |
| `text` | `#111114` | Títulos, corpo e símbolo |
| `text-muted` | `#60606B` | Descrições e rótulos secundários |
| `border` | `#E3E3E8` | Separação decorativa entre superfícies |
| `control-border` | `#858590` | Contorno necessário para identificar campos |
| `primary` | `#2457E8` | Ação principal e seleção |
| `primary-hover` | `#1945C4` | Hover da ação principal |
| `primary-soft` | `#EEF2FF` | Fundo de item selecionado |
| `success` | `#137A52` | Conclusão e disponibilidade |
| `warning` | `#895600` | Atenção |
| `danger` | `#BA2838` | Erros e ações destrutivas |
| `focus` | `#2457E8` | Contorno de foco |

Usar texto branco em botões azuis. Validar contraste nas combinações finais: mínimo 4,5:1 para texto normal, 3:1 para texto grande e elementos essenciais de interface. Bordas decorativas claras não devem ser o único sinal de um controle. Estados sempre combinam texto ou ícone com a cor.

## Espaçamento e forma

- Escala de espaçamento: **4, 8, 12, 16, 24, 32, 48, 64 px**.
- Raio: 8 px em teclas; 12 px em campos e botões; 20 px em cards; formato cápsula em status.
- Área de conteúdo: 32 px de margem no desktop; 16 px em janelas compactas.
- Barra lateral: 240 px como ponto de partida, ajustável conforme a janela.
- Cards: padding de 24 px e intervalo de 16 px.
- Altura de botão e campo: 44 px; área clicável mínima recomendada de 44 × 44 px.
- Sombra de card: `0 2px 8px rgb(17 17 20 / 4%)`; evitar empilhar sombras.

O pontilhado visto na captura pode aparecer de forma muito discreta em áreas vazias. Não aplicar sob textos, tabelas, campos ou gráficos que exijam precisão de leitura.

## Componentes

| Componente | Aparência | Comportamento |
| --- | --- | --- |
| Botão primário | Fundo azul, texto branco, raio 12 px | Uma ação principal por contexto; rótulo por verbo |
| Botão secundário | Fundo branco, contorno visível, texto escuro | Ação alternativa |
| Botão discreto | Sem preenchimento, texto escuro | Ações de baixa ênfase |
| Item de navegação | Ícone de 20 px e rótulo | Selecionado com fundo azul suave e texto azul; expor estado ativo |
| Card de indicador | Número, unidade e descrição | Mesma definição e período para comparações |
| Campo | Rótulo persistente acima, contorno visível | Erro abaixo do campo; placeholder não substitui rótulo |
| Tecla de atalho | Fundo branco, contorno cinza, raio 8 px | Preferir símbolos reais: Fn, ⇧, ⌘, Espaço |
| Status de voz | Indicador e rótulo explícito | Pronto, Ouvindo…, Processando…, Concluído ou Erro |
| Notificação | Mensagem curta, ícone e ação opcional | Persistir erros até resolução ou dispensa |

Todo controle interativo deve prever padrão, hover, pressionado, foco e desabilitado. Ações assíncronas também precisam de estado de carregamento; impedir submissão repetida sem remover a indicação do que está acontecendo.

### Fluxo de ditado

1. **Pronto para ouvir** — ação “Iniciar ditado”.
2. **Ouvindo…** — mostrar atividade e ação “Parar ditado”.
3. **Processando…** — explicar o andamento sem prometer prazo.
4. **Texto inserido** — confirmação breve após sucesso real.
5. **Não foi possível concluir** — motivo conhecido e ação “Tentar novamente”.

Não apagar transcrições já produzidas quando ocorrer um erro. Se faltar permissão de microfone, explicar como concedê-la. A indicação de gravação deve permanecer visível enquanto houver captura.

## Indicadores e gráficos

Sempre informar o período e definir a métrica. Distinguir palavras transcritas de palavras efetivamente inseridas. Identificar tempo economizado como **estimativa** e documentar a fórmula e a velocidade de digitação assumida. Não apresentar zero quando o dado estiver indisponível.

Usar azul na série principal e cinza nas comparações. Em mapas de atividade, acompanhar intensidades com legenda e valor acessível. Rankings devem indicar unidade e período, e manter escalas comparáveis. Atividade vazia deve ter um estado explicativo, como “Seu histórico aparecerá após o primeiro ditado”.

## Ícones e movimento

Ícones de interface: traço consistente de 1,75 a 2 px em grade de 24 px, cantos arredondados e sem misturar famílias. Ícones sem rótulo visível precisam de nome acessível e dica de ferramenta quando útil.

Transições curtas de 120 a 180 ms; entrada de painel até 220 ms. Evitar movimento decorativo contínuo. Respeitar preferência de movimento reduzido e oferecer indicação estática de captura.

## Texto e acessibilidade

Tom direto, humano e em português brasileiro. Preferir “Iniciar ditado”, “Texto copiado” e “Permita o acesso ao microfone”. Evitar jargão técnico nas mensagens.

Usar títulos semânticos, rótulos associados aos campos, foco visível de 2 px com afastamento de 2 px e ordem de teclado previsível. Não interceptar atalhos do sistema sem necessidade. Anunciar mudanças importantes de status a leitores de tela sem narrar cada atualização da onda de áudio.

## Tokens CSS iniciais

```css
:root {
  --font-sans: "Nunito Sans", -apple-system, BlinkMacSystemFont,
    "Segoe UI", sans-serif;
  --color-background: #ffffff;
  --color-surface: #f5f5f7;
  --color-surface-hover: #ebebef;
  --color-text: #111114;
  --color-text-muted: #60606b;
  --color-border: #e3e3e8;
  --color-control-border: #858590;
  --color-primary: #2457e8;
  --color-primary-hover: #1945c4;
  --color-primary-soft: #eef2ff;
  --color-success: #137a52;
  --color-warning: #895600;
  --color-danger: #ba2838;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;
  --radius-sm: 8px;
  --radius-control: 12px;
  --radius-card: 20px;
  --shadow-card: 0 2px 8px rgb(17 17 20 / 4%);
  --duration-fast: 120ms;
  --duration-normal: 180ms;
}

body {
  font-family: var(--font-sans);
  color: var(--color-text);
  background: var(--color-background);
}

:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.metric-value { font-variant-numeric: tabular-nums; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    scroll-behavior: auto !important;
  }
}
```

Carregar os arquivos de fonte no projeto e testar pesos 400, 600, 700 e 800. Estes tokens são para o tema claro; o modo escuro exige uma paleta própria e validação de contraste, sem inversão automática.

## Critérios para implementação

- Marca consistente no app, instalador e materiais.
- Fonte real carregada e sem cortes em textos em português.
- Navegação por teclado e leitura de status verificadas.
- Contraste validado nos componentes implementados.
- Cards testados com janela estreita, texto ampliado e números longos.
- Estados vazios, falhas de rede e permissão negada tratados.
- Indicadores acompanhados de período e definição.
- Atalhos exibidos conforme a configuração real do usuário.

Esta versão define a base de implementação; não representa alteração já aplicada ao aplicativo.
