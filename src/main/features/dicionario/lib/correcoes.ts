// Detecta palavras que o usuário corrigiu no campo depois de colar um ditado (função pura).
//
// Algoritmo: separa os dois textos em palavras; alinha pelas palavras iguais vizinhas (maior subsequência
// comum, ignorando maiúscula e acento); nos trechos entre âncoras, emparelha as palavras do texto colado
// com as do campo por similaridade (distância de edição normalizada >= 0,5, ou mesma inicial e tamanho
// parecido). Das palavras novas, só aprende as que têm cara de termo próprio.
import { PALAVRAS_COMUNS } from "./palavrasComuns.ts";

interface Palavra {
  texto: string;
  /** minúscula e sem acento */
  chave: string;
  inicio: number;
}

export interface ResultadoCorrecoes {
  /** false quando o texto colado não aparece mais no campo (apagado, trocado por outro). */
  localizado: boolean;
  /** Termos novos para aprender (sem repetição). */
  termos: string[];
}

const LIMITE_SIMILARIDADE = 0.5;
const MIN_LETRAS = 3;
/** Teto de comparações do alinhamento, para nunca travar com texto gigante. */
const MAX_CELULAS = 6_000_000;

const semAcento = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "");

function separar(texto: string): Palavra[] {
  const out: Palavra[] = [];
  for (const m of texto.matchAll(/[\p{L}\p{N}_]+(?:['’-][\p{L}\p{N}_]+)*/gu)) {
    out.push({ texto: m[0], chave: semAcento(m[0].toLowerCase()), inicio: m.index ?? 0 });
  }
  return out;
}

function distancia(a: string, b: string): number {
  if (a === b) return 0;
  let ant = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const atual = [i];
    for (let j = 1; j <= b.length; j++) {
      atual[j] = Math.min(ant[j] + 1, atual[j - 1] + 1, ant[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    ant = atual;
  }
  return ant[b.length];
}

/** Parecidas o bastante para ser "a mesma palavra trocada"? */
export function parecidas(a: string, b: string): boolean {
  if (!a || !b) return false;
  const maior = Math.max(a.length, b.length);
  if (1 - distancia(a, b) / maior >= LIMITE_SIMILARIDADE) return true;
  return a[0] === b[0] && Math.min(a.length, b.length) / maior >= 0.6;
}

function inicioDeFrase(texto: string, indice: number): boolean {
  const antes = texto.slice(0, indice).replace(/[\s"'“”‘’(\[]+$/u, "");
  return antes === "" || /[.!?:\n]$/.test(antes) || /\n\s*$/.test(texto.slice(0, indice));
}

function temCaraDeTermo(nova: Palavra, texto: string): boolean {
  const letras = nova.texto.replace(/[^\p{L}]/gu, "");
  if (letras.length < MIN_LETRAS) return false;
  if (/\p{N}/u.test(nova.texto)) return true;
  const comecoFrase = inicioDeFrase(texto, nova.inicio);
  // Maiúscula fora do início de frase (a 1ª letra no início de frase não conta).
  const resto = comecoFrase ? nova.texto.slice(1) : nova.texto;
  if (/\p{Lu}/u.test(resto)) return true;
  return !PALAVRAS_COMUNS.has(nova.chave);
}

/** Alinhamento por maior subsequência comum: pares [índice no colado, índice no atual]. */
function ancoras(p: Palavra[], a: Palavra[]): Array<[number, number]> | null {
  const n = p.length;
  const m = a.length;
  if ((n + 1) * (m + 1) > MAX_CELULAS) return null;
  const w = m + 1;
  const t = new Uint16Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      t[i * w + j] = p[i].chave === a[j].chave ? t[(i + 1) * w + j + 1] + 1 : Math.max(t[(i + 1) * w + j], t[i * w + j + 1]);
    }
  }
  const pares: Array<[number, number]> = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (p[i].chave === a[j].chave) {
      pares.push([i, j]);
      i++;
      j++;
    } else if (t[(i + 1) * w + j] >= t[i * w + j + 1]) i++;
    else j++;
  }
  return pares;
}

export function encontrarCorrecoes(textoColado: string, textoAtual: string): ResultadoCorrecoes {
  const p = separar(textoColado);
  const a = separar(textoAtual);
  const nao = { localizado: false, termos: [] };
  if (p.length === 0 || a.length === 0) return nao;

  const pares = ancoras(p, a);
  if (!pares) return nao;
  // Localizado = pelo menos metade das palavras coladas continua no campo.
  if (pares.length * 2 < p.length || pares.length === 0) return nao;

  const termos: string[] = [];
  const vistos = new Set<string>();
  const considerar = (pc: Palavra, at: Palavra) => {
    if (pc.texto === at.texto) return;
    if (pc.chave === at.chave) {
      // Só acento ou só maiúscula: acento nunca aprende; maiúscula só fora do início de frase.
      if (pc.texto.toLowerCase() !== at.texto.toLowerCase()) return;
      if (inicioDeFrase(textoAtual, at.inicio)) return;
    } else if (!parecidas(pc.chave, at.chave)) return;
    if (!temCaraDeTermo(at, textoAtual)) return;
    const k = at.texto.toLowerCase();
    if (vistos.has(k)) return;
    vistos.add(k);
    termos.push(at.texto);
  };

  // Âncoras com a mesma palavra: só pode ter mudado acento/maiúscula (ex.: "manske" -> "Manske").
  for (const [i, j] of pares) considerar(p[i], a[j]);

  // Trechos entre âncoras (e as pontas) onde as palavras diferem.
  const fronteiras: Array<[number, number]> = [[-1, -1], ...pares, [p.length, a.length]];
  for (let k = 0; k < fronteiras.length - 1; k++) {
    const [pi, ai] = fronteiras[k];
    const [pf, af] = fronteiras[k + 1];
    const gp = p.slice(pi + 1, pf);
    let ga = a.slice(ai + 1, af);
    if (gp.length === 0 || ga.length === 0) continue;
    // Pontas: o campo pode ter texto alheio ali; só olha as palavras coladas ao trecho conhecido.
    if (k === 0) ga = ga.slice(-(gp.length + 1));
    else if (k === fronteiras.length - 2) ga = ga.slice(0, gp.length + 1);
    // Emparelha em ordem, por similaridade.
    let ponteiro = 0;
    for (const pc of gp) {
      let melhor = -1;
      for (let j = ponteiro; j < ga.length; j++) {
        if (parecidas(pc.chave, ga[j].chave) || (pc.chave === ga[j].chave)) {
          melhor = j;
          break;
        }
      }
      if (melhor < 0) continue;
      considerar(pc, ga[melhor]);
      ponteiro = melhor + 1;
    }
  }
  return { localizado: true, termos };
}
