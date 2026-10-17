// Sons curtos de início/fim/cancelamento, gerados na hora (sem arquivos de áudio).
import { VOLUME_SONS } from "@shared/config";

export type Som = "inicio" | "fim" | "cancelar";

/** Notas de cada som: [frequência Hz, início s, duração s]. */
const NOTAS: Record<Som, [number, number, number][]> = {
  inicio: [
    [660, 0, 0.07],
    [990, 0.07, 0.09],
  ],
  fim: [
    [990, 0, 0.07],
    [660, 0.07, 0.09],
  ],
  cancelar: [[330, 0, 0.12]],
};

let ctx: AudioContext | null = null;

export function tocar(som: Som): void {
  ctx ??= new AudioContext();
  const agora = ctx.currentTime;
  for (const [freq, inicio, duracao] of NOTAS[som]) {
    const osc = ctx.createOscillator();
    const ganho = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    // Envelope curto para não estalar.
    ganho.gain.setValueAtTime(0, agora + inicio);
    ganho.gain.linearRampToValueAtTime(VOLUME_SONS, agora + inicio + 0.01);
    ganho.gain.exponentialRampToValueAtTime(0.0001, agora + inicio + duracao);
    osc.connect(ganho).connect(ctx.destination);
    osc.start(agora + inicio);
    osc.stop(agora + inicio + duracao + 0.02);
  }
}
