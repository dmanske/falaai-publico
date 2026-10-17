// Medição do ritmo da fala no próprio computador (sem IA): onde a pessoa parou, por quanto tempo
// e quanto do áudio é fala. O resultado vira dica no prompt (ver bloco.ts). Função pura, sem rede.

// ── Valores ajustáveis ───────────────────────────────────────────────────────
/** Tamanho do quadro de análise (energia RMS por quadro). */
export const QUADRO_S = 0.02;
/** Silêncio entre dois trechos de fala a partir do qual conta como pausa. */
export const PAUSA_MINIMA_S = 0.45;
/** Pausa a partir daqui é "longa" (fim de frase/parágrafo ou separação de itens). */
export const PAUSA_LONGA_S = 1.2;
/** O ruído de fundo é estimado como este percentil (0–1) da energia dos quadros. */
export const PERCENTIL_RUIDO = 0.15;
/** Limiar para ENTRAR em fala = ruído × este fator (≈ +9,5 dB acima do ruído de fundo). */
export const FATOR_LIMIAR_ENTRADA = 3;
/** Limiar para SAIR da fala = ruído × este fator (histerese: menor que o de entrada). */
export const FATOR_LIMIAR_SAIDA = 2;
/** Energia mínima (RMS, 0–1) para existir fala: ≈ −46 dBFS. Abaixo disso o áudio é tratado como silêncio. */
export const ENERGIA_MINIMA = 0.005;
/** O limiar nunca passa desta fração do percentil 90 da energia (senão fala contínua viraria "silêncio"). */
export const FRACAO_MAXIMA_DO_P90 = 0.15;
/** Trechos de fala mais curtos que isto são estalos/ruído e viram silêncio. */
export const FALA_MINIMA_S = 0.1;

export interface Pausa {
  inicioS: number;
  fimS: number;
  duracaoS: number;
  tipo: "curta" | "longa";
}

export interface Ritmo {
  duracaoS: number;
  /** Soma dos trechos com fala. */
  falaS: number;
  pausas: Pausa[];
}

const VAZIO: Ritmo = { duracaoS: 0, falaS: 0, pausas: [] };
const arred = (n: number): number => Math.round(n * 100) / 100;

interface Pcm {
  amostras: Int16Array;
  taxa: number;
  canais: number;
}

/** Lê o cabeçalho WAV (procurando o chunk "data", sem assumir 44 bytes). null = não é PCM16 legível. */
function lerWav(wav: Buffer): Pcm | null {
  if (wav.length < 12 || wav.toString("ascii", 0, 4) !== "RIFF" || wav.toString("ascii", 8, 12) !== "WAVE") return null;
  let taxa = 16000;
  let canais = 1;
  let bits = 16;
  let formato = 1;
  let pos = 12;
  while (pos + 8 <= wav.length) {
    const id = wav.toString("ascii", pos, pos + 4);
    const tam = wav.readUInt32LE(pos + 4);
    const corpo = pos + 8;
    if (id === "fmt " && corpo + 16 <= wav.length) {
      formato = wav.readUInt16LE(corpo);
      canais = wav.readUInt16LE(corpo + 2) || 1;
      taxa = wav.readUInt32LE(corpo + 4) || 16000;
      bits = wav.readUInt16LE(corpo + 14);
    } else if (id === "data") {
      if (bits !== 16 || (formato !== 1 && formato !== 0xfffe)) return null;
      // Tamanho 0 ou maior que o arquivo (gravação interrompida): vale até o fim do buffer.
      const fim = Math.min(wav.length, tam === 0 || corpo + tam > wav.length ? wav.length : corpo + tam);
      const n = Math.floor((fim - corpo) / 2);
      const amostras = new Int16Array(n);
      for (let i = 0; i < n; i++) amostras[i] = wav.readInt16LE(corpo + i * 2);
      return { amostras, taxa, canais };
    }
    pos = corpo + tam + (tam % 2); // chunks têm alinhamento par
  }
  return null;
}

function percentil(ordenado: number[], p: number): number {
  if (!ordenado.length) return 0;
  return ordenado[Math.min(ordenado.length - 1, Math.floor(p * ordenado.length))];
}

/** Energia RMS (0–1) de cada quadro; com mais de um canal usa só o primeiro. */
function energias(pcm: Pcm): number[] {
  const porQuadro = Math.max(1, Math.round(pcm.taxa * QUADRO_S));
  const total = Math.floor(pcm.amostras.length / pcm.canais);
  const saida: number[] = [];
  for (let ini = 0; ini + porQuadro <= total; ini += porQuadro) {
    let soma = 0;
    for (let i = 0; i < porQuadro; i++) {
      const v = pcm.amostras[(ini + i) * pcm.canais] / 32768;
      soma += v * v;
    }
    saida.push(Math.sqrt(soma / porQuadro));
  }
  return saida;
}

/** Mede duração, tempo de fala e pausas de um WAV (PCM16). Nunca lança: entrada inválida = vazio. */
export function analisarRitmo(wav: Buffer): Ritmo {
  const pcm = lerWav(wav);
  if (!pcm) return VAZIO;
  const total = Math.floor(pcm.amostras.length / pcm.canais);
  const duracaoS = arred(total / pcm.taxa);
  const e = energias(pcm);
  if (!e.length) return { ...VAZIO, duracaoS };

  const ordenada = [...e].sort((a, b) => a - b);
  const ruido = percentil(ordenada, PERCENTIL_RUIDO);
  const p90 = percentil(ordenada, 0.9);
  if (p90 < ENERGIA_MINIMA) return { duracaoS, falaS: 0, pausas: [] };
  const teto = FRACAO_MAXIMA_DO_P90 * p90;
  const entrada = Math.min(teto, Math.max(ENERGIA_MINIMA, ruido * FATOR_LIMIAR_ENTRADA));
  const saida = Math.min(entrada, Math.max(ENERGIA_MINIMA * 0.6, ruido * FATOR_LIMIAR_SAIDA));

  // Fala/silêncio por quadro, com histerese.
  const fala: boolean[] = [];
  let falando = false;
  for (const v of e) {
    falando = falando ? v >= saida : v >= entrada;
    fala.push(falando);
  }

  // Trechos de fala (índices de quadro); descarta os curtos demais.
  const minimoQuadros = Math.max(1, Math.round(FALA_MINIMA_S / QUADRO_S));
  const trechos: { ini: number; fim: number }[] = [];
  for (let i = 0; i < fala.length; ) {
    if (!fala[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j < fala.length && fala[j]) j++;
    if (j - i >= minimoQuadros) trechos.push({ ini: i, fim: j });
    i = j;
  }

  const falaS = trechos.reduce((s, t) => s + (t.fim - t.ini) * QUADRO_S, 0);
  // Pausa = silêncio ENTRE dois trechos (o do começo e o do fim do áudio são ignorados).
  const pausas: Pausa[] = [];
  for (let k = 1; k < trechos.length; k++) {
    const inicioS = trechos[k - 1].fim * QUADRO_S;
    const fimS = trechos[k].ini * QUADRO_S;
    const dur = fimS - inicioS;
    if (dur >= PAUSA_MINIMA_S - 1e-9) {
      pausas.push({ inicioS: arred(inicioS), fimS: arred(fimS), duracaoS: arred(dur), tipo: dur >= PAUSA_LONGA_S - 1e-9 ? "longa" : "curta" });
    }
  }
  return { duracaoS, falaS: arred(falaS), pausas };
}
