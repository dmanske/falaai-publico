# Estilos da pílula e tema de clube

Em Configurações > Pílula o usuário escolhe o visual da pílula: um dos 7 **estilos gerais** (aba Estilos)
ou um **clube** com 3 variantes (aba Futebol). Se escolher um clube e deixar "Usar as cores do clube no
app" ligado, o destaque do app (hub) também ganha a cor dele. Protótipo aprovado em 17/10/2026 (arquivo
`opcoes-marca/pilulas.html`, que não está neste repositório).

## Onde ficam os dados

| O quê | Onde |
|---|---|
| Preferência `estiloPilula` (`{tipo:"estilo",id}` ou `{tipo:"clube",id,variante}`) e `coresDoClubeNoApp` | `src/shared/ipc/preferencias.ts` (padrões em `src/main/features/preferencias/index.ts`) |
| Estilos gerais (id, nome, descrição) | `src/shared/temas/estilosPilula.ts` |
| Clubes (cores, padrão da camisa, escudo) | `src/shared/temas/clubes.ts` |
| Cores derivadas (variantes do clube, contraste, paleta do app) | `src/shared/temas/coresClube.ts` (testes ao lado) |
| CSS dos estilos e das peças da pílula | `src/renderer/src/features/pilula/estilos.css` |
| Escudos | `src/renderer/src/assets/escudos/*.svg` (licença em `assets/LICENCAS.md`) |

## Como funciona

- **Um só conjunto de peças.** `PilulaVisual` (`features/pilula/components/`) desenha ✕, escudo, sigla,
  onda/pontos e ✓ lendo variáveis CSS `--pil-*`. Cada estilo geral define as variáveis na classe `pil-<id>`;
  os de clube recebem as variáveis inline, calculadas por `variaveisDoClube(clube, variante)`. A miniatura
  de Configurações é a mesma `PilulaVisual` com a onda parada.
- **Janela.** Tem o tamanho exato da pílula, então não há sombra para fora (contornos são `inset`). Com
  estilo de clube que tem escudo a janela fica **26 px mais larga** nos estados gravando/processando
  (170×38, tradução 214×38); erro/aviso não mudam (300×38) e usam sempre a pílula preta, para o texto
  ficar legível. Ao trocar o estilo com a pílula na tela, `src/main/janelas/pilula.ts` reposiciona.
- **Variantes do clube.**
  - *camisa*: o padrão (`liso`, `listras-verticais`, `listras-horizontais`, `faixa-diagonal`,
    `faixa-horizontal`, `meio-a-meio`) com as duas primeiras cores, e um véu preto mais forte nas laterais
    (no Flamengo: centro 0,15 e bordas 0,55) para a onda branca aparecer. ✓ branco com ícone na cor principal.
  - *escura*: fundo `#0b0b0b`, contorno e ✓ na cor principal, barras alternando principal e branco.
  - *faixa*: cor principal com faixa horizontal da segunda cor no meio; ✓ na segunda cor.
- **Regra de contraste** (luminância relativa do WCAG): a onda e os ícones são brancos, então a cor
  principal da camisa/faixa precisa ter contraste >= 3:1 com o branco; na variante escura, >= 3:1 com o
  fundo preto. Se a primeira cor não passa (branco, amarelo, preto na escura…), usa-se a próxima que
  passa; se nenhuma passa, a de maior contraste. Quando o padrão ainda tem cor clara (ex.: listras
  branco e preto), o véu preto do centro aumenta (até 0,6) o bastante para o branco aparecer. Ícone sobre
  botão colorido usa branco ou quase-preto, o que contrastar mais.
- **Modo (ditado, pergunte, tradução).** No estilo *Original* continua como antes: a onda muda de cor
  (branca, azul, verde). Em todos os outros a onda tem as cores do estilo, então o modo aparece como um
  **pontinho de 5 px no alto, no centro da pílula**, azul (pergunte) ou verde (tradução); no ditado não
  há pontinho. No modo tradução a sigla do idioma com bandeira continua aparecendo.
- **Movimento.** A aurora, o pulo dos pontos e a transição das barras param com `prefers-reduced-motion`;
  a onda continua acompanhando o volume, só sem o tremor aleatório.
- **Tema do app.** `useCoresDoTema` (`features/hub/hooks/`) injeta um `<style id="cores-do-clube">` no
  `<head>` do hub que sobrescreve `--color-destaque`, `-claro`, `-2` e `-3` no claro (`:root`) e no escuro
  (`:root.dark`). A cor de destaque é a primeira do clube que sustenta texto branco (4,5:1), escurecida se
  preciso. Trocar para um estilo geral ou desligar o interruptor remove o `<style>` e volta o azul. Só o
  hub é afetado (onboarding e cartão de resposta ficam no azul).

## Como adicionar um clube

1. Copie o escudo (SVG, sem script) para `src/renderer/src/assets/escudos/<id>.svg` e registre a origem
   e a licença em `src/renderer/src/assets/LICENCAS.md`.
2. Acrescente **uma linha** em `CLUBES` (`src/shared/temas/clubes.ts`): `id`, `nome`, `nomeCompleto`,
   `serie`, `estado`, `cores` (hex; a primeira é a principal), `padrao` e `escudo` (nome do arquivo, ou
   `null` se não houver). Nada mais: lista, busca, variantes, largura da janela e tema saem dos dados.
3. Rode `npm test` e `npm run typecheck`.

Os 20 clubes da Série A 2026 já estão cadastrados (cores, padrão da camisa e escudo). As cores e os padrões vêm da camisa 1 (dados em `clubes.ts`; o contraste tem testes unitários); **a pílula de cada clube ainda não foi vista durante um ditado real**.

## Tema do app com as cores do clube (17/10/2026)

Com um clube escolhido e "Usar as cores do <clube> no app" ligado (topo da aba Futebol), `useCoresDoTema`
põe a classe `tema-clube` no `<html>` e as variáveis `--clube-*` (`cssTemaDoClube` em
`src/shared/temas/coresClube.ts`). As regras ficam em `estilos.css`:
- menu lateral com o padrão da camisa em versão escura (preto + cor do clube escurecida), logo branco e
  item ativo na cor do clube; o cartão com o nome continua claro;
- faixa com as listras do clube no topo de cada página (no lugar das ondas) e o escudo no canto;
- tokens de destaque (botões, seleção, gráficos) na cor do clube.
Desligar a chave ou voltar a um estilo geral remove tudo.
