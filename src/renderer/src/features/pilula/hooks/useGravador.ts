// Grava o microfone (MediaRecorder) e mede o volume para a onda da pílula.
import { useCallback, useRef, useState } from "react";
import { TAXA_AMOSTRAGEM } from "@shared/config";
import type { AudioPilula } from "@shared/ipc";
import { gravacaoParaWav } from "../lib/wav";

interface Gravacao {
  sessao: number;
  stream: MediaStream;
  gravador: MediaRecorder;
  pedacos: Blob[];
  ctx: AudioContext;
  quadroAnimacao: number;
}

function liberar(g: Gravacao): void {
  cancelAnimationFrame(g.quadroAnimacao);
  g.stream.getTracks().forEach((t) => t.stop());
  void g.ctx.close();
}

export function useGravador() {
  const atual = useRef<Gravacao | null>(null);
  /** Enquanto o getUserMedia não volta, o "parar" espera por esta promessa. */
  const preparando = useRef<Promise<void> | null>(null);
  const [nivel, setNivel] = useState(0);

  const iniciar = useCallback((sessao: number, microfoneId: string | null) => {
    preparando.current = (async () => {
      const basico = { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true };
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: microfoneId ? { ...basico, deviceId: { exact: microfoneId } } : basico,
        });
      } catch (e) {
        // Microfone escolhido sumiu (desconectado): cai no padrão do sistema.
        if (!microfoneId) throw e;
        stream = await navigator.mediaDevices.getUserMedia({ audio: basico });
      }
      const ctx = new AudioContext();
      const analisador = ctx.createAnalyser();
      analisador.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analisador);
      const amostras = new Uint8Array(analisador.fftSize);

      const gravador = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      const g: Gravacao = { sessao, stream, gravador, pedacos: [], ctx, quadroAnimacao: 0 };
      gravador.ondataavailable = (e) => e.data.size && g.pedacos.push(e.data);
      gravador.start(250);

      const medir = () => {
        analisador.getByteTimeDomainData(amostras);
        let soma = 0;
        for (const a of amostras) soma += ((a - 128) / 128) ** 2;
        setNivel(Math.min(1, Math.sqrt(soma / amostras.length) * 4));
        g.quadroAnimacao = requestAnimationFrame(medir);
      };
      medir();
      atual.current = g;
    })();
    return preparando.current;
  }, []);

  const parar = useCallback(async (sessao: number): Promise<AudioPilula> => {
    try {
      await preparando.current;
    } catch (e) {
      return { sessao, ok: false, erro: `Não consegui abrir o microfone: ${(e as Error).message}` };
    }
    const g = atual.current;
    if (!g || g.sessao !== sessao) return { sessao, ok: false, erro: "Nenhuma gravação em andamento." };
    atual.current = null;
    await new Promise<void>((resolver) => {
      g.gravador.onstop = () => resolver();
      g.gravador.stop();
    });
    liberar(g);
    setNivel(0);
    try {
      const { wav, duracaoMs } = await gravacaoParaWav(new Blob(g.pedacos, { type: "audio/webm" }), TAXA_AMOSTRAGEM);
      return { sessao, ok: true, wav, duracaoMs };
    } catch (e) {
      return { sessao, ok: false, erro: `Falha ao converter o áudio: ${(e as Error).message}` };
    }
  }, []);

  const cancelar = useCallback(async () => {
    await preparando.current?.catch(() => {});
    const g = atual.current;
    atual.current = null;
    if (g) {
      g.gravador.stop();
      liberar(g);
    }
    setNivel(0);
  }, []);

  return { nivel, iniciar, parar, cancelar };
}
