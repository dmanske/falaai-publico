> **Arquivado em 17/10/2026.** Versão completa do antigo DESIGN_VISUAL.md, substituída por [../design/DESIGN_SYSTEM.md](../design/DESIGN_SYSTEM.md). Alguns valores abaixo (tamanho da pílula, "só o Flamengo") estavam desatualizados.

# Visual do FalaAi

Referências do Typeless (passadas pelo Daniel em 17/10/2026): `referencias/typeless-inicio.png` (janela
principal) e `referencias/typeless-pilula.png` (pílula gravando). O FalaAi segue o **estilo** delas com
identidade própria. Não copiar logo, nome, textos de marketing, nem os cartões de indicação, afiliados
ou planos (não existem num app local).

Pedido do Daniel (17/10/2026): "seja mais fiel… sombras na tecla de atalho, as letras um pouquinho mais
bonitas, os cards menores… mais criativo e mais preciso". Os valores abaixo foram **medidos no app
instalado** (CSS/tema do pacote), não estimados pelo print.

## Tipografia

- **Fredoka** (Google Fonts, SIL Open Font License; pacote `@fontsource/fredoka`, pesos 500/600/700) nos
  títulos, números grandes, teclas de atalho e logo → classe `font-titulo`. Espaçamento entre letras 0.
- **Fonte do sistema** (SF Pro no Mac, Segoe UI no Windows) no resto.
- Título da página 54 px semibold; título de seção 26 px medium cinza; número 34 px
  semibold com unidade 15 px; legenda 15 px.

## Cores (tokens em `src/renderer/src/estilos.css`)

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `fundo` | #FFFFFF | #242121 | janela |
| `painel` | #F2F1F0 (cinza quente) | #1B1919 | menu lateral, painel de atalhos |
| `cartao` | #FFFFFF | #3C3B3B | cartões |
| `texto` / `medio` / `suave` / `apagado` | #111 a 100/75/55/35% | #F2F1F0 a 100/75/55/35% | textos |
| `borda` | cinza 119 a 15% | claro a 10% | contornos |
| `acao` | #1D1A1A | #F2F1F0 | botão principal (escuro, como no Typeless) |
| `destaque` (+ `-claro`, `-2`, `-3`) | #1F5DF2 | #4F7BFF | acento, calendário, interruptores |

## Sombras

- `shadow-cartao`: camadas bem leves + contorno de 1 px a 7% (sem borda visível).
- `shadow-tecla`: `0 4px 4px rgba(0,0,0,.04), 0 0 1px rgba(0,0,0,.6)` — o "relevo" das teclas.

## Toques próprios

- Ondas azul-claro no fundo da área principal do hub (o menu lateral não tem), com três opções na
  preferência `fundo` (Configurações > Geral > Fundo): `"topo"` (padrão, ondas atrás do título),
  `"completo"` (ondas em cima e no pé da janela) e `"nenhum"` (só o pontilhado). Rolam com o conteúdo, não pegam cliques e no modo escuro
  ficam bem discretas (opacidade 0,12). CSS em `.fundo-ondas-topo`, `.fundo-ondas-completo` e `.ondas-pe`
  (`estilos.css`). Substituem o antigo brilho atrás do título, que foi removido.
- Logos das empresas (provedores de IA e transcrição) e bandeiras dos idiomas, em
  `src/renderer/src/assets/`; origem e licenças em `src/renderer/src/assets/LICENCAS.md`. Logos de uma cor
  só invertem no modo escuro.
- Logo do FalaAi (`assets/marca/logo.png`, já com o nome) no menu lateral e nas boas-vindas.
- Calendário de dias ativos com células vazias **hachuradas** (`.celula-vazia`), como na referência.
- Rodapé do menu: botões de Configurações e Sobre centralizados, "Criado por Daniel Manske" e a marca
  da última atualização (data e hora). O código aleatório do build (`src/shared/build.ts`) aparece só na
  dica ao passar o mouse e em Configurações > Sobre.

## Boas-vindas (onboarding)

O 1º passo usa o papel de parede da marca com "Fale, não digite." (`assets/marca/boas-vindas.jpg`) na janela
inteira e um cartão claro com o resumo. É sempre claro, mesmo com o tema escuro (`useTema(forcarClaro)`).

## Ícone do app

Marca do Daniel (17/10/2026): F abstrato de duas curvas. Arquivos-fonte em `build/marca/` (ícone, logo,
logo com a frase "Fale, não digite." e papéis de parede). `scripts/gerar-icone-app.swift` reenquadra o
ícone na grade do macOS (quadrado de 824 em 1024) e recorta o F do logo para a barra de menus. Saídas:
`build/icon.png` (1024, instalador Mac e Windows), `resources/icone-app.png` (512, Dock em dev e janela)
e `resources/iconeBandejaTemplate.png` / `@2x`. Regras da marca: [../design/DESIGN_SYSTEM.md](../design/DESIGN_SYSTEM.md).

## Componentes comuns (src/renderer/src/components/ui/index.tsx)

`TituloPagina`, `TituloSecao`, `Cartao`, `Numero`, `Botao` (primario/destaque/secundario/fantasma/perigo),
`CampoTexto`, `Tecla`, `Interruptor`, `LinhaConfig`, `Vazio`. Componente genérico novo entra nesse
arquivo; componente usado por um módulo só fica no módulo.

## Pílula

Preta, com ✕ à esquerda, onda simétrica no meio (cor por modo: branca ditado, azul pergunte, verde
tradução) e ✓ à direita (ver `docs/modulos/ditado.md`). Desde 17/10/2026 é mais compacta e mais baixa:
144×38 (tradução 188×38, erro 300×38), botões de 28 px, onda de até 20 px, 20 px acima do Dock
(`TAMANHO` e `MARGEM_INFERIOR` em `src/main/janelas/pilula.ts`).

Estilos (17/10/2026): em Configurações > Pílula há 7 estilos gerais (original, vidro, azul, aurora, neon,
pôr do sol, equalizador) e clubes de futebol (por enquanto só o Flamengo) com 3 variantes (camisa, escura,
faixa) e o escudo de 20×25 entre o ✕ e a onda, que deixa a janela 26 px mais larga. O modo continua
visível: no estilo original a onda muda de cor; nos demais, um pontinho de 5 px no alto da pílula (azul
pergunte, verde tradução). Erro/aviso ficam sempre na pílula preta. Como funciona e como adicionar um
clube: [../modulos/pilula-estilos.md](../modulos/pilula-estilos.md).
