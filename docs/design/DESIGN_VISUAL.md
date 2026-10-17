# Visual do FalaAi

Referências do Typeless (passadas pelo Daniel em 17/10/2026): `referencias/typeless-inicio.png` (janela
principal) e `referencias/typeless-pilula.png` (pílula gravando). O FalaAi segue o **estilo** delas com
identidade própria. Não copiar logo, nome, textos de marketing, nem os cartões de indicação, afiliados
ou planos (não existem num app local).

## Linguagem

- **Janela principal (hub):** menu lateral claro (`bg-painel`, cantos bem arredondados, inset) com logo
  "FalaAi" e itens Início · Histórico · Dicionário; Configurações e Ajuda como ícones no rodapé do menu.
  Área principal branca, com título gigante (`TituloPagina`, ex.: "Fale, não digite") e seções com título
  cinza (`TituloSecao`, ex.: "Percepções").
- **Cartões:** brancos, `rounded-cartao` (20 px), sombra quase nula e borda fina. Números grandes e
  em negrito com unidade pequena ("20.6K palavras") e legenda cinza embaixo (`Numero`).
- **Destaque:** azul `#3B5BFD` (`bg-destaque`), também nos tons do calendário de dias ativos.
- **Teclas de atalho:** pequenas teclas brancas com borda (`Tecla`).
- **Espaço:** respiro generoso (padding de 24 a 32 px), nada apertado.
- **Modo escuro:** classe `dark` no `<html>`; os tokens já mudam sozinhos.
- **Tipografia:** fonte do sistema (SF Pro no Mac, Segoe no Windows).

## Tokens (src/renderer/src/estilos.css)

`fundo`, `painel`, `cartao`, `borda`, `texto`, `suave`, `destaque`, `destaque-claro`, `perigo`, `sucesso`
→ classes `bg-*`, `text-*`, `ring-*`, `border-*`.

## Componentes comuns (src/renderer/src/components/ui/index.tsx)

`TituloPagina`, `TituloSecao`, `Cartao`, `Numero`, `Botao` (primario/secundario/fantasma/perigo),
`CampoTexto`, `Tecla`, `Interruptor`, `LinhaConfig`, `Vazio`. Componente genérico novo entra nesse
arquivo; componente usado por um módulo só fica no módulo.

## Pílula

Preta, com ✕ à esquerda, onda simétrica no meio e ✓ à direita (ver `docs/modulos/ditado.md`).
