# Design system do FalaAi

Descreve o que **está implementado** (versão 1.0.0, 17/10/2026). Os valores foram tirados do código; quando
um valor mudar lá, mude aqui. A fonte de verdade é sempre o arquivo citado em cada seção.

Não confundir com a proposta anterior (Nunito Sans e outra paleta), que não foi adotada e está em
[../_arquivo/DESIGN_SYSTEM_PROPOSTA_2026-10-17.md](../_arquivo/DESIGN_SYSTEM_PROPOSTA_2026-10-17.md).

## 1. Marca

- **Nome:** FalaAi (essa capitalização). **Frase:** "Fale, não digite."
- **Símbolo:** um F abstrato formado por duas curvas.
- **Arquivos-fonte** (originais do Daniel) em `build/marca/`:

| Arquivo | O que é |
|---|---|
| `icone.png` (1254×1254) | Ícone do macOS com o F |
| `logo.png` (2172×724) | F + nome "FalaAi" |
| `logo-slogan.png` | Logo com a frase "Fale, não digite." |
| `papel-de-parede.png`, `papel-de-parede-slogan.png` | Fundos da marca (1672×941) |

- **Cópias usadas pelas telas** em `src/renderer/src/assets/marca/`: `logo.png` (menu lateral) e
  `boas-vindas.jpg` (1º passo do onboarding, sempre claro).
- **Logo no app:** `features/hub/components/Logo.tsx`, altura de 28 px (`h-7`). No modo escuro é invertido
  (`dark:invert`); com o tema do clube fica branco (`brightness(0) invert(1)`).
- **Ícone do app:** `scripts/gerar-icone-app.swift` reenquadra `icone.png` na grade do macOS (quadrado de
  **824 px dentro de 1024**) e gera `build/icon.png` (1024, usado no Mac e no Windows) e
  `resources/icone-app.png` (512, Dock em desenvolvimento e janelas).
- **Ícone da barra de menus:** o mesmo script recorta só o F do `logo.png` e gera
  `resources/iconeBandejaTemplate.png` e `@2x`, em preto com transparência. O sufixo `Template` faz o macOS
  pintar o ícone conforme o tema.
- **Regras de uso:** preto sobre fundo claro, branco sobre fundo escuro; não esticar nem girar o símbolo.
  Tamanhos mínimos e margem de proteção **não foram definidos** (a proposta que os trazia foi arquivada).

## 2. Tipografia

- **Fredoka** (SIL Open Font License, pacote `@fontsource/fredoka`, pesos 500, 600 e 700, subconjuntos latin e
  latin-ext) em títulos, números grandes, teclas de atalho, nomes de cartões e siglas. Classe `font-titulo`
  (`--font-titulo`), com fallback para a fonte do sistema.
- **Fonte do sistema** no resto: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui`
  (SF Pro no Mac, Segoe UI no Windows), com suavização `antialiased`.
- **Tamanhos usados** (`components/ui/index.tsx` e telas):

| Uso | Tamanho / peso | Onde |
|---|---|---|
| Título da página | 54 px, semibold, entrelinha 1,05, Fredoka | `TituloPagina` |
| Título de seção | 26 px, medium, cinza (`text-suave`), Fredoka | `TituloSecao` |
| Número grande | 34 px, semibold, Fredoka | `Numero` |
| Unidade do número | 15 px, medium, Fredoka | `Numero` |
| Legenda / subtítulo | 15 px, `text-suave` | `Numero`, `TituloPagina` |
| Título de cartão de Configurações | 18 px (`text-lg`), semibold | `CartaoSecao` |
| Item do menu lateral | 16 px (`text-base`) | `MenuLateral` |
| Corpo, botões, campos, rótulos | 14 px (`text-sm`) | `Botao`, `CampoTexto`, `LinhaConfig` |
| Descrição de uma linha | 12 px (`text-xs`), `text-suave` | `Interruptor`, `LinhaConfig` |
| Tecla de atalho | 17 px, medium, Fredoka | `Tecla` |
| Rodapé do menu | 11 a 13 px | `Assinatura` |
| Sigla do idioma na pílula | 11 px, semibold, Fredoka | `.pil-sigla` |

O menor texto do app é 11 px (selos e rodapé); nada essencial usa menos de 12 px.

## 3. Cores

Tokens em `src/renderer/src/estilos.css`, no bloco `@theme` (claro) e `.dark` (escuro). O Tailwind gera as
classes `bg-fundo`, `text-suave`, `ring-borda`, `bg-destaque` etc. O hub põe a classe `dark` no `<html>` conforme
a preferência `tema` (`sistema`, `claro` ou `escuro`).

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `fundo` | #FFFFFF | #242121 | Janela |
| `painel` | #F2F1F0 | #1B1919 | Menu lateral, painéis |
| `painel-forte` | #E9E8E6 | #111111 | Painel em destaque |
| `cartao` | #FFFFFF | #3C3B3B | Cartões, campos, teclas |
| `texto` | #111111 | #F2F1F0 | Texto principal |
| `medio` | #111 a 75% | #F2F1F0 a 75% | Texto secundário |
| `suave` | #111 a 55% | #F2F1F0 a 55% | Legendas |
| `apagado` | #111 a 35% | #F2F1F0 a 35% | Placeholder |
| `borda` | rgba(119,119,119,.15) | rgba(242,241,240,.10) | Contornos, filetes |
| `borda-fina` | rgba(119,119,119,.07) | rgba(119,119,119,.15) | Contorno do cartão |
| `acao` / `acao-texto` | #1D1A1A / #F2F1F0 | #F2F1F0 / #111111 | Botão principal |
| `destaque` | #1F5DF2 | #4F7BFF | Acento, interruptor ligado, foco |
| `destaque-claro` | #EFF0FF | #00164E | Fundo de item selecionado |
| `destaque-2` | #C9D3FF | #00287D | Acento médio |
| `destaque-3` | #A2B6FF | #003BAE | Acento forte (calendário, gráficos) |
| `perigo` | #FF525C | #FF525C | Excluir, erro |
| `sucesso` | #00957C | #00957C | Ok, "ouve áudio" |
| `hover` | rgba(119,119,119,.07) | rgba(119,119,119,.30) | Passar o mouse |
| `selecionado` | rgba(119,119,119,.15) | rgba(119,119,119,.20) | Item selecionado |

Cores fixas fora dos tokens: modos da pílula (secção 7) e o gradiente do avatar do criador
(`destaque` até #8B5CF6).

Os tokens `destaque*` são substituídos quando o tema do clube está ligado (secção 8).

## 4. Sombras, raios e espaçamentos

- **Sombras** (`--shadow-*`):
  - `shadow-cartao`: duas camadas leves (1,25 px e 2,5 px) mais um contorno de 1 px a 7%; no escuro, uma
    camada a 20% e contorno claro a 6%.
  - `shadow-cartao-alto`: para elementos sobrepostos (`0 3px 8px -2px` e `0 14px 14px`).
  - `shadow-tecla`: `0 4px 4px rgba(0,0,0,.04), 0 0 1px rgba(0,0,0,.6)`, o relevo das teclas de atalho.
- **Raios:**

| Raio | Valor | Onde |
|---|---|---|
| Cartão | 1,25 rem (20 px), `rounded-cartao` | `Cartao` |
| Menu lateral | `rounded-3xl` (24 px) | `MenuLateral` |
| Campos, cartões de provedor, itens do menu | `rounded-xl` (12 px) | `CampoTexto`, `GradeProvedores` |
| Tecla | 10 px | `Tecla` |
| Botão, interruptor, pílula | totalmente redondo | `Botao`, `Interruptor` |

- **Espaçamentos recorrentes:** cartão com `px-6 py-[18px]`; botão `px-4 py-2` com `gap-2`; campo
  `px-3.5 py-2.5`; linha de configuração `py-3` e `gap-6`; menu lateral com 212 px de largura, `p-3` e margem de
  `m-3`; título da página com `mb-9`; título de seção com `mb-4`.
- **Janela principal:** 1080×750, mínimo 988×685 (`HUB_TAMANHO` em `src/shared/config.ts`). No Mac a barra de
  título é escondida (`hiddenInset`) e o menu reserva 48 px no topo para os botões da janela.

## 5. Fundo

- **Pontilhado:** classe `.fundo-pontilhado`, pontos de 1 px a cada 16 px, na área principal do hub.
- **Ondas:** imagens `assets/ondas/topo.jpg` e `baixo.jpg`, atrás do conteúdo, sem pegar cliques e rolando junto.
  O menu lateral não tem ondas. A preferência `fundo` (Configurações > Geral > Fundo) escolhe:

| Valor | O que mostra |
|---|---|
| `topo` (padrão) | Faixa de ondas atrás do título (300 px, esmaecendo para baixo) |
| `completo` | Ondas em cima (340 px) e no pé da janela, sobre fundo levemente azulado (#FBFCFE) |
| `nenhum` | Só o pontilhado |

  No modo escuro as ondas ficam a 12% de opacidade e o fundo claro do `completo` some. Com o tema do clube
  ligado, a faixa do clube ocupa o lugar das ondas (secção 8).
- **Calendário de dias ativos:** células vazias hachuradas em diagonal (`.celula-vazia`).

## 6. Componentes e padrões de tela

Componentes comuns em `src/renderer/src/components/ui/index.tsx`. Componente genérico novo entra nesse arquivo;
o que só um módulo usa fica no módulo.

| Componente | Função |
|---|---|
| `TituloPagina` | Título grande da página, com subtítulo opcional |
| `TituloSecao` | Título de seção, com ação à direita |
| `Cartao` | Cartão branco arredondado com `shadow-cartao` |
| `Numero` | Número grande com unidade e legenda |
| `NumeroAnimado` | Texto de um número que sobe contando de 0 e anima nas mudanças (`useNumeroAnimado`, easeOutCubic 250 ms como o Typeless; respeita `prefers-reduced-motion`) |
| `Botao` | Variantes `primario` (escuro/claro), `destaque` (azul), `secundario` (cartão com contorno), `fantasma` e `perigo`. Sempre arredondado; desativado a 40% |
| `CampoTexto` | Campo com contorno; foco com anel de 2 px na cor `destaque` |
| `Tecla` | Tecla desenhada (36 px de altura, mínimo 36 de largura) |
| `Interruptor` | Liga/desliga (40×24 px), com `role="switch"` e `aria-checked` |
| `LinhaConfig` | Rótulo e descrição à esquerda, controle à direita |
| `Vazio` | Estado vazio com título, texto e ação |

Padrões de tela:

- **Menu lateral** (`features/hub/components/MenuLateral.tsx`): logo, três itens (Início, Histórico, Dicionário)
  e, no rodapé, três botões de ícone (Configurações, Sobre e o **botão de tema** que alterna claro/escuro na hora
  e salva a preferência), o cartão com o nome do criador e a marca "Atualizado ..." (data da última build).
  O código aleatório da build só aparece na dica ao passar o mouse e em Configurações > Sobre.
- **Páginas:** `TituloPagina` no topo, depois cartões em coluna. Início tem números, calendário de atividade,
  apps mais usados e o painel de atalhos.
- **Configurações:** lista de seções à esquerda (Geral, Pílula, Atalhos, Envio automático, Idiomas, Áudio, Dados e
  privacidade, IA, Permissões, Sobre) e um `CartaoSecao` à direita, com filetes entre as linhas
  (`divide-borda`). Tudo salva na hora, sem botão de salvar.
- **Provedores de IA:** grade de cartões pequenos (logo de 22 px, nome em Fredoka e selo "ouve áudio" em verde ou
  "precisa de transcrição" em cinza); o selecionado ganha fundo `destaque-claro` e anel de 2 px.
- **Onboarding:** 6 passos com barra de progresso no topo; o 1º passo é sempre claro.

## 7. Pílula

Janela flutuante, transparente, que não rouba o foco (ver [../modulos/ditado.md](../modulos/ditado.md)). Código:
`src/main/janelas/pilula.ts` (tamanho e posição), `features/pilula/` (visual) e `features/pilula/estilos.css`.

**Tamanhos** (`TAMANHO` em `pilula.ts`), 20 px acima do Dock (`MARGEM_INFERIOR`):

| Estado | Largura × altura |
|---|---|
| Gravando / processando | 144 × 38 |
| Tradução (cabe bandeira e sigla) | 188 × 38 |
| Erro ou aviso | 300 × 38 |
| Com escudo de clube | +26 px nos dois primeiros (170 e 214) |

Peças: botões ✕ e ✓ de 28 px (ícone de 14 px), onda de até 20 px de altura com barras de 3 px e vão de 3 px,
escudo de 20×25 px, sigla do idioma com bandeira de 16×12 px. Os contornos são `inset` e não há sombra para
fora, porque a janela tem o tamanho exato da pílula.

**Estados:** gravando (onda acompanha o volume), processando (três pontos pulando), erro e aviso (sempre pílula
preta `#0A0A0A` com texto de 12 px, em qualquer estilo) e oculta.

**Cor por modo** (estilo Original, `COR_MODO` em `PilulaVisual.tsx`): ditado branco `#FFFFFF`, pergunte azul
`#8EA2FF`, tradução verde `#6FE0A6`. Nos outros estilos a onda tem as cores do estilo e o modo aparece como um
pontinho de 5 px no alto, no centro (azul no pergunte, verde na tradução; no ditado não há pontinho).

**Os 7 estilos gerais** (`src/shared/temas/estilosPilula.ts`; CSS na classe `pil-<id>`):

| Estilo | Visual |
|---|---|
| Original | Preta `#0A0A0A`, onda branca |
| Vidro | Branca translúcida (62%) com desfoque, ícones e onda `#111` |
| Azul FalaAi | Degradê `#2F6BFF` até `#1F5DF2` |
| Aurora | Degradê `#4338CA`, `#7C3AED`, `#0EA5E9` que se move devagar (6 s) |
| Neon | `#05060A` com barras ciano `#22D3EE` e rosa `#F0ABFC` brilhando |
| Pôr do sol | Degradê `#F97316` até `#EC4899` |
| Equalizador | Preta, cada uma das 11 barras de uma cor (do vermelho ao roxo) |

**Clubes de futebol** (`src/shared/temas/clubes.ts`): os 20 clubes da Série A 2026, cada um com cores, padrão
da camisa (`liso`, `listras-verticais`, `listras-horizontais`, `faixa-diagonal`, `faixa-horizontal`,
`meio-a-meio`) e escudo. Três variantes (`VARIANTES_CLUBE`):

| Variante | Visual |
|---|---|
| Camisa | O padrão da camisa com as duas primeiras cores, mais um véu preto que escurece as laterais |
| Escura | Fundo `#0B0B0B`, contorno de 1,5 px, ✓ e barras na cor de identidade do clube |
| Faixa | Cor principal com faixa horizontal da segunda cor no meio (34% a 66%) |

**Regras de contraste** (`src/shared/temas/coresClube.ts`, com testes em `coresClube.test.ts`). Todas usam a
luminância relativa do WCAG 2:

- A onda e os ícones são brancos, então o fundo precisa ter contraste mínimo de **3:1** com o branco
  (`CONTRASTE_GRAFICO`). Para texto no botão de destaque do app, o mínimo é **4,5:1** (`CONTRASTE_TEXTO`).
- **Cor de identidade** (`corDeIdentidade`): primeira cor do clube com saturação HSL de pelo menos 0,25
  (verde do Palmeiras, azul do Cruzeiro). Clube só preto e branco não tem; a variante escura usa branco.
- **`ajustarContraste`**: clareia (sobre fundo escuro) ou escurece (sobre fundo claro) a cor, **mantendo o
  tom**, em passos de 5% até atingir o contraste. Evita que o azul do Cruzeiro vire branco na variante escura.
- **Camisa escura/colorida:** o véu preto do centro sobe de 0,15 até o necessário (máximo 0,60) para a onda
  branca aparecer; as bordas ficam 0,40 mais escuras (máximo 0,75).
- **Camisa clara** (luminância da primeira cor acima de 0,6, como Santos, Corinthians e São Paulo): a pílula
  fica clara, com onda e botões na cor mais escura do clube (ou `#0B0B0B`), em vez de escurecer o branco.
- **Faixa:** se a segunda cor é clara demais, ela é escurecida mantendo o tom (amarelo vira dourado); se for
  branca, vira um tom médio do próprio clube.
- Ícone sobre botão colorido: branco ou quase-preto, o que tiver mais contraste (`textoSobre`).

## 8. Tema do clube no app

Com um clube escolhido na pílula e o interruptor "Usar as cores do clube no app" ligado (padrão ligado),
`useCoresDoTema` (`features/hub/hooks/`) põe a classe `tema-clube` no `<html>` e injeta um
`<style id="cores-do-clube">`. Só o hub é afetado; onboarding e cartão de resposta ficam no azul.

- **Destaque:** os 4 tokens `destaque*` passam para a cor do clube: a primeira cor que sustenta texto branco a
  4,5:1, escurecida se preciso; no escuro é clareada até 3:1 contra o fundo `#242121`.
- **Menu lateral:** o padrão da camisa em versão escura (preto + a cor de identidade escurecida até 7:1 com o
  branco; clube preto e branco usa `#3A3A3A`), texto branco, logo branco e item ativo na cor do clube. O cartão do
  criador continua claro (ou escuro no tema escuro).
- **Faixa no topo de cada página:** as listras do clube (260 px, opacidade 0,16; 0,22 no escuro), no lugar das
  ondas, e o **escudo** (76×92 px) no canto superior direito.
- Desligar o interruptor ou voltar a um estilo geral remove tudo e devolve o azul.

Detalhes e como adicionar um clube: [../modulos/pilula-estilos.md](../modulos/pilula-estilos.md).

## 9. Logos de terceiros, bandeiras e escudos

Em `src/renderer/src/assets/`; origem e licença de cada arquivo em `assets/LICENCAS.md`.

- **Logos dos provedores e serviços** (`logos/`): SVGs do `@lobehub/icons-static-svg` 1.95.1 (MIT) e o do
  Deepgram do Simple Icons (CC0). São marcas registradas dos donos, usadas só para identificar o provedor.
  Logos de uma cor só invertem no modo escuro.
- **Bandeiras** (`bandeiras/`): `flag-icons` 7.6.0 (MIT), proporção 4×3, nos idiomas e na sigla da pílula.
- **Escudos** (`escudos/`): **marcas registradas dos clubes, mantidas aqui apenas para uso pessoal.** Não
  distribua nem venda o app com eles. Dois (Bragantino e Vasco) têm licença de uso justo apenas na Wikipedia; o
  do Corinthians é CC BY-SA 4.0 (exige atribuição). Quem for publicar uma versão com os escudos deve rever isso
  antes.

## 10. Acessibilidade

- **Contraste:** o texto principal é `#111` sobre branco ou `#F2F1F0` sobre `#242121`. O texto `suave` (55%) e
  `apagado` (35%) é mais fraco: `apagado` só aparece em placeholders. Os contrastes desses dois tons **não foram
  medidos**. Nas cores do clube o mínimo é 3:1 para elementos gráficos e 4,5:1 para texto de botão, garantidos
  por código e testes.
- **Movimento:** a pílula respeita `prefers-reduced-motion` (aurora parada, pontos sem pulo, barras sem
  transição; a onda continua seguindo o volume, sem o tremor aleatório). O resto do app tem poucas animações
  (transições curtas de cor) e **não tem tratamento próprio** para essa preferência.
- **Foco:** campos de texto e seletores mostram anel de 2 px na cor `destaque` ao receber foco. Os botões não
  têm estilo de foco próprio (usam o do navegador). O interruptor usa `role="switch"` com `aria-checked`, os
  botões de ícone têm `aria-label` e a grade de provedores usa `role="radiogroup"`.
- **Não verificado:** leitor de tela, navegação completa só pelo teclado e o modo de alto contraste do Windows
  não foram testados.
