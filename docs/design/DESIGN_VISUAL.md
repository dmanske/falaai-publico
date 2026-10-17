# Visual do FalaAi

Referências do Typeless (passadas pelo Daniel em 17/10/2026): `referencias/typeless-inicio.png` (janela
principal) e `referencias/typeless-pilula.png` (pílula gravando). O FalaAi segue o **estilo** delas com
identidade própria. Não copiar logo, nome, textos de marketing, nem os cartões de indicação, afiliados
ou planos (não existem num app local).

Pedido do Daniel (17/10/2026): "seja mais fiel… sombras na tecla de atalho, as letras um pouquinho mais
bonitas, os cards menores… mais criativo e mais preciso". Os valores abaixo foram **medidos no app
instalado** (CSS/tema do pacote), não estimados pelo print.

## Tipografia

- **Prompt** (Google Fonts, SIL Open Font License; pacote `@fontsource/prompt`, pesos 500/600/700) nos
  títulos, números grandes, teclas de atalho e logo → classe `font-titulo`. É a mesma família que o
  Typeless usa (`--font-prompt`).
- **Fonte do sistema** (SF Pro no Mac, Segoe UI no Windows) no resto.
- Título da página 54 px semibold, espaçamento −2%; título de seção 26 px medium cinza; número 34 px
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

- Brilho azul/lilás desfocado atrás do título de cada página (`.brilho-titulo`).
- Calendário de dias ativos com células vazias **hachuradas** (`.celula-vazia`), como na referência.
- Rodapé do menu: "Criado por Daniel Manske" e a marca da última atualização (data, hora e código
  aleatório do build — `src/shared/build.ts`), que muda a cada build.

## Componentes comuns (src/renderer/src/components/ui/index.tsx)

`TituloPagina`, `TituloSecao`, `Cartao`, `Numero`, `Botao` (primario/destaque/secundario/fantasma/perigo),
`CampoTexto`, `Tecla`, `Interruptor`, `LinhaConfig`, `Vazio`. Componente genérico novo entra nesse
arquivo; componente usado por um módulo só fica no módulo.

## Pílula

Preta, com ✕ à esquerda, onda simétrica no meio (cor por modo: branca ditado, azul pergunte, verde
tradução) e ✓ à direita (ver `docs/modulos/ditado.md`).
