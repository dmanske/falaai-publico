// Cores derivadas dos dados de um clube: o visual da pílula (3 variantes) e a paleta de destaque do app.
// Tudo aqui é função pura, sem dependência (por isso roda direto no `node --test`).
// Regra de contraste: usa a luminância relativa do WCAG. A onda e os ícones são brancos, então cada cor
// de fundo precisa ter contraste >= 3:1 com o branco (mínimo para elementos gráficos); texto de botão do
// app pede 4,5:1. Quando a cor principal não passa (branco, amarelo…), troca para a próxima que passa.
import type { Clube, PadraoCamisa, VarianteClube } from "./clubes";

export const BRANCO = "#ffffff";
export const QUASE_PRETO = "#0b0b0b";
/** Contraste mínimo para a onda/ícones sobre o fundo da pílula. */
export const CONTRASTE_GRAFICO = 3;
/** Contraste mínimo para texto branco sobre o botão de destaque do app. */
export const CONTRASTE_TEXTO = 4.5;

export function hexParaRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  if (!/^[0-9a-f]{6}$/i.test(h.slice(0, 6)) || Number.isNaN(n)) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbParaHex(r: number, g: number, b: number): string {
  const p = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${p(r)}${p(g)}${p(b)}`;
}

/** Luminância relativa (0 = preto, 1 = branco), fórmula do WCAG 2. */
export function luminancia(hex: string): number {
  const [r, g, b] = hexParaRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razão de contraste entre duas cores (1 a 21). */
export function contraste(a: string, b: string): number {
  const [la, lb] = [luminancia(a), luminancia(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Mistura `a` com `b`: peso 0 = só a, 1 = só b. */
export function misturar(a: string, b: string, peso: number): string {
  const [ra, ga, ba] = hexParaRgb(a);
  const [rb, gb, bb] = hexParaRgb(b);
  return rgbParaHex(ra + (rb - ra) * peso, ga + (gb - ga) * peso, ba + (bb - ba) * peso);
}

const rgba = (hex: string, alfa: number): string => {
  const [r, g, b] = hexParaRgb(hex);
  return `rgba(${r},${g},${b},${alfa})`;
};

/** Branco ou quase-preto, o que tiver mais contraste sobre o fundo (ex.: ícone sobre um botão). */
export function textoSobre(fundo: string): string {
  return contraste(BRANCO, fundo) >= contraste(QUASE_PRETO, fundo) ? BRANCO : QUASE_PRETO;
}

/**
 * Primeira cor da lista com contraste >= `minimo` contra `referencia`; se nenhuma passar, a de maior
 * contraste. É assim que "a cor principal muito clara" cede lugar à segunda cor.
 */
export function corComContraste(cores: readonly string[], referencia: string, minimo: number): string {
  const lista = cores.length ? cores : [QUASE_PRETO];
  return lista.find((c) => contraste(c, referencia) >= minimo) ?? lista.reduce((m, c) => (contraste(c, referencia) > contraste(m, referencia) ? c : m));
}

/** Saturação (0 a 1) no modelo HSL: preto, branco e cinzas ficam perto de 0. */
export function saturacao(hex: string): number {
  const [r, g, b] = hexParaRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return 0;
  return (max - min) / (1 - Math.abs(2 * l - 1));
}

/** Abaixo disso a cor conta como neutra (preto, branco, cinza). */
const SATURACAO_MINIMA = 0.25;

/**
 * Cor que identifica o clube: a primeira da lista que não é neutra (verde do Palmeiras, azul do
 * Cruzeiro, grená do Fluminense). null quando o clube é só preto e branco (Atlético-MG, Santos…).
 */
export function corDeIdentidade(cores: readonly string[]): string | null {
  return cores.find((c) => saturacao(c) >= SATURACAO_MINIMA) ?? null;
}

/**
 * Clareia (sobre fundo escuro) ou escurece (sobre fundo claro) a cor, mantendo o tom, até o contraste
 * mínimo com a referência. Antes trocava-se de cor (o azul do Cruzeiro virava branco).
 */
export function ajustarContraste(cor: string, referencia: string, minimo: number): string {
  const alvo = luminancia(referencia) < 0.5 ? BRANCO : "#000000";
  let resultado = cor;
  for (let peso = 0.05; contraste(resultado, referencia) < minimo && peso <= 1; peso += 0.05) {
    resultado = misturar(cor, alvo, peso);
  }
  return resultado;
}

/** Primeira cor que não seja `principal`; sem ela, a principal escurecida (a faixa precisa ser visível). */
function outraCor(cores: readonly string[], principal: string): string {
  return cores.find((c) => c.toLowerCase() !== principal.toLowerCase()) ?? misturar(principal, "#000000", 0.55);
}

/**
 * Menor escurecimento (alfa de um véu preto, de `minimo` a 0,6) que deixa TODAS as cores com contraste
 * >= 3 com o branco. É o que faz a onda branca aparecer em camisas com cor clara.
 */
export function escurecimentoNecessario(cores: readonly string[], minimo: number): number {
  for (let a = minimo; a < 0.6; a += 0.05) {
    if (cores.every((c) => contraste(misturar(c, "#000000", a), BRANCO) >= CONTRASTE_GRAFICO)) return Math.round(a * 100) / 100;
  }
  return 0.6;
}

const R = (n: number) => Math.round(n * 100) / 100;

/** Fundo CSS do padrão da camisa. As alturas/larguras casam com a pílula (38 px = 6 listras de 6,33 px). */
export function fundoDoPadrao(padrao: PadraoCamisa, a: string, b: string): string {
  switch (padrao) {
    case "listras-horizontais":
      return `repeating-linear-gradient(180deg,${a} 0 6.33px,${b} 6.33px 12.66px)`;
    case "listras-verticais":
      return `repeating-linear-gradient(90deg,${a} 0 12px,${b} 12px 24px)`;
    case "faixa-diagonal":
      return `linear-gradient(110deg,${a} 0 36%,${b} 36% 64%,${a} 64%)`;
    case "faixa-horizontal":
      return `linear-gradient(180deg,${a} 0 34%,${b} 34% 66%,${a} 66%)`;
    case "meio-a-meio":
      return `linear-gradient(90deg,${a} 0 50%,${b} 50%)`;
    default:
      return a;
  }
}

/** Variáveis CSS (--pil-*) que a classe `pil-clube` lê em features/pilula/estilos.css. */
export type VariaveisPilula = Record<`--pil-${string}`, string>;

// A janela da pílula tem o tamanho exato dela: sombra para fora seria cortada. Por isso o contorno é
// "inset" (desenhado por dentro) e não há sombra de elevação.

export function variaveisDoClube(clube: Pick<Clube, "cores" | "padrao">, variante: VarianteClube): VariaveisPilula {
  const cores = clube.cores.length ? clube.cores : [QUASE_PRETO];

  if (variante === "escura") {
    // Fundo preto: a cor de identidade do clube, clareada até aparecer sobre ele (o azul do Cruzeiro
    // continua azul). Clube preto e branco usa branco.
    const identidade = corDeIdentidade(cores);
    const p = identidade ? ajustarContraste(identidade, QUASE_PRETO, CONTRASTE_GRAFICO) : BRANCO;
    return {
      "--pil-fundo": QUASE_PRETO,
      "--pil-sombra": `inset 0 0 0 1.5px ${p}`,
      "--pil-overlay": "none",
      "--pil-cancelar-bg": "rgba(255,255,255,.16)",
      "--pil-cancelar-fg": BRANCO,
      "--pil-confirmar-bg": p,
      "--pil-confirmar-fg": textoSobre(p),
      "--pil-confirmar-sombra": "none",
      "--pil-barra-a": p,
      "--pil-barra-b": BRANCO,
      "--pil-ponto": p,
      "--pil-sigla-bg": rgba(p, 0.18),
      "--pil-sigla-fg": misturar(p, BRANCO, 0.4),
    };
  }

  const p = corComContraste(cores, BRANCO, CONTRASTE_GRAFICO);

  if (variante === "faixa") {
    // Faixa clara somiria a onda branca: colorida (amarelo) só escurece mantendo o tom (vira dourado);
    // branca vira um tom médio do próprio clube.
    const outra = outraCor(cores, p);
    const clara = contraste(outra, BRANCO) < CONTRASTE_GRAFICO;
    const f = !clara ? outra : saturacao(outra) >= SATURACAO_MINIMA ? ajustarContraste(outra, BRANCO, CONTRASTE_GRAFICO) : ajustarContraste(misturar(outra, p, 0.5), BRANCO, CONTRASTE_GRAFICO);
    const alfa = escurecimentoNecessario([p, f], 0);
    return {
      "--pil-fundo": fundoDoPadrao("faixa-horizontal", p, f),
      "--pil-sombra": "none",
      "--pil-overlay": alfa > 0 ? rgba("#000000", alfa) : "none",
      "--pil-cancelar-bg": "rgba(0,0,0,.35)",
      "--pil-cancelar-fg": BRANCO,
      // ✓ na segunda cor quando ela é escura (Flamengo: preto); senão branco com o check na cor do clube
      // (antes usava a faixa clareada e o botão parecia desativado).
      "--pil-confirmar-bg": clara ? BRANCO : outra,
      "--pil-confirmar-fg": clara ? p : textoSobre(outra),
      "--pil-confirmar-sombra": clara ? "none" : "0 0 0 1.5px rgba(255,255,255,.7)",
      "--pil-barra-a": BRANCO,
      "--pil-barra-b": BRANCO,
      "--pil-ponto": BRANCO,
      "--pil-sigla-bg": "rgba(0,0,0,.45)",
      "--pil-sigla-fg": BRANCO,
    };
  }

  // Camisa: padrão com as duas primeiras cores, escurecido nas laterais (no centro só o necessário
  // para a onda branca aparecer; 0,15 é o piso do protótipo aprovado).
  const a = cores[0];
  const b = clube.padrao === "liso" ? a : (cores[1] ?? a);
  if (luminancia(a) > 0.6) {
    // Camisa branca/clara (Santos, Corinthians, Bragantino, São Paulo): fica clara, com onda e botões
    // escuros, em vez de escurecer o branco até virar cinza.
    // Peças na cor mais escura do próprio clube (azul-marinho do Mirassol, preto do Santos/São Paulo).
    const maisEscura = cores.reduce((m, c) => (luminancia(c) < luminancia(m) ? c : m));
    const escuro = luminancia(maisEscura) < 0.2 ? maisEscura : QUASE_PRETO;
    return {
      "--pil-fundo": fundoDoPadrao(clube.padrao, a, b),
      "--pil-sombra": "inset 0 0 0 1px rgba(0,0,0,.12)",
      "--pil-overlay": "linear-gradient(90deg,rgba(0,0,0,.08),rgba(0,0,0,0) 30%,rgba(0,0,0,0) 70%,rgba(0,0,0,.08))",
      "--pil-cancelar-bg": "rgba(0,0,0,.08)",
      "--pil-cancelar-fg": escuro,
      "--pil-confirmar-bg": escuro,
      "--pil-confirmar-fg": BRANCO,
      "--pil-confirmar-sombra": "none",
      "--pil-barra-a": escuro,
      "--pil-barra-b": escuro,
      "--pil-ponto": escuro,
      "--pil-sigla-bg": "rgba(0,0,0,.08)",
      "--pil-sigla-fg": escuro,
    };
  }
  const centro = escurecimentoNecessario(clube.padrao === "liso" ? [a] : [a, b], 0.15);
  const borda = R(Math.min(0.75, centro + 0.4));
  return {
    "--pil-fundo": fundoDoPadrao(clube.padrao, a, b),
    "--pil-sombra": "none",
    "--pil-overlay": `linear-gradient(90deg,rgba(0,0,0,${borda}),rgba(0,0,0,${centro}) 30%,rgba(0,0,0,${centro}) 70%,rgba(0,0,0,${borda}))`,
    "--pil-cancelar-bg": "rgba(255,255,255,.22)",
    "--pil-cancelar-fg": BRANCO,
    "--pil-confirmar-bg": BRANCO,
    "--pil-confirmar-fg": p,
    "--pil-confirmar-sombra": "none",
    "--pil-barra-a": BRANCO,
    "--pil-barra-b": BRANCO,
    "--pil-ponto": BRANCO,
    "--pil-sigla-bg": "rgba(0,0,0,.55)",
    "--pil-sigla-fg": BRANCO,
  };
}

/** Cor de destaque do app: a primeira do clube que sustenta texto branco (4,5:1); senão a melhor escurecida. */
export function corDestaqueDoClube(cores: readonly string[]): string {
  let cor = corComContraste(cores, BRANCO, CONTRASTE_TEXTO);
  for (let peso = 0.1; contraste(cor, BRANCO) < CONTRASTE_TEXTO && peso <= 1; peso += 0.1) {
    cor = misturar(corComContraste(cores, BRANCO, CONTRASTE_TEXTO), "#000000", peso);
  }
  return cor;
}

export interface PaletaDestaque {
  destaque: string;
  claro: string;
  d2: string;
  d3: string;
}

/** Os 4 tokens de destaque derivados de uma cor, no modo claro e no escuro (mesma lógica dos tokens azuis). */
export function paletaDestaque(base: string): { claro: PaletaDestaque; escuro: PaletaDestaque } {
  const fundoEscuro = "#242121";
  let destaqueEscuro = misturar(base, BRANCO, 0.22);
  for (let peso = 0.3; contraste(destaqueEscuro, fundoEscuro) < CONTRASTE_GRAFICO && peso < 1; peso += 0.1) {
    destaqueEscuro = misturar(base, BRANCO, peso);
  }
  return {
    claro: {
      destaque: base,
      claro: misturar(base, BRANCO, 0.92),
      d2: misturar(base, BRANCO, 0.78),
      d3: misturar(base, BRANCO, 0.62),
    },
    escuro: {
      destaque: destaqueEscuro,
      claro: misturar(base, "#000000", 0.7),
      d2: misturar(base, "#000000", 0.5),
      d3: misturar(base, "#000000", 0.28),
    },
  };
}

const declaracoes = (p: PaletaDestaque) =>
  `--color-destaque:${p.destaque};--color-destaque-claro:${p.claro};--color-destaque-2:${p.d2};--color-destaque-3:${p.d3};`;

/**
 * CSS que sobrescreve os tokens de destaque. `:root` (depois do tema) vale no claro e `:root.dark`,
 * mais específico, no escuro. Remover o <style> devolve o azul do FalaAi.
 */
export function cssDestaqueDoClube(cores: readonly string[]): string {
  const { claro, escuro } = paletaDestaque(corDestaqueDoClube(cores));
  return `:root{${declaracoes(claro)}}:root.dark{${declaracoes(escuro)}}`;
}

/** Padrão da camisa em tamanho grande (menu lateral e faixa do topo do app); liso vira um degradê suave. */
export function fundoGrandeDoPadrao(padrao: PadraoCamisa, a: string, b: string): string {
  switch (padrao) {
    case "listras-horizontais":
      return `repeating-linear-gradient(180deg,${a} 0 26px,${b} 26px 52px)`;
    case "listras-verticais":
      return `repeating-linear-gradient(90deg,${a} 0 22px,${b} 22px 44px)`;
    case "liso":
      return `linear-gradient(180deg,${b},${a})`;
    default:
      return fundoDoPadrao(padrao, a, b);
  }
}

/**
 * Tema do app com as cores do clube (Configurações > Pílula > Futebol + "Usar as cores do clube no app"):
 * tokens de destaque + variáveis lidas em estilos.css (`.tema-clube`): o menu lateral com o padrão da
 * camisa em versão escura (texto branco legível), a faixa do topo e a cor do texto no item ativo.
 */
export function cssTemaDoClube(clube: Pick<Clube, "cores" | "padrao">): string {
  const cores = clube.cores.length ? clube.cores : [QUASE_PRETO];
  // Menu: preto + a cor de identidade escura o bastante para o texto branco (7:1); clube preto e branco
  // usa cinza escuro. Antes o verde/azul escuros "não apareciam sobre preto" e o menu ficava cinza.
  const identidade = corDeIdentidade(cores);
  const tom = identidade ? ajustarContraste(identidade, BRANCO, 7) : "#3a3a3a";
  const menu = fundoGrandeDoPadrao(clube.padrao, QUASE_PRETO, tom);
  const faixa = fundoGrandeDoPadrao(clube.padrao, cores[0], cores[1] ?? cores[0]);
  const destaque = corDestaqueDoClube(cores);
  return `${cssDestaqueDoClube(cores)}:root{--clube-menu:${menu};--clube-faixa:${faixa};--clube-ativo-texto:${textoSobre(destaque)};}`;
}
