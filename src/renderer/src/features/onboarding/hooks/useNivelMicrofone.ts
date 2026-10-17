import { useEffect, useState } from "react";

/** Abre o microfone e devolve o nível (0 a 1) ao vivo. Para tudo ao desmontar. */
export function useNivelMicrofone(microfoneId: string | null | undefined, ativo: boolean) {
  const [nivel, setNivel] = useState(0);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!ativo || microfoneId === undefined) return;
    let cancelado = false;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let raf = 0;

    (async () => {
      try {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: microfoneId ? { deviceId: { exact: microfoneId } } : true,
          });
        } catch (e) {
          if (!microfoneId) throw e;
          stream = await navigator.mediaDevices.getUserMedia({ audio: true }); // microfone sumiu: padrão
        }
        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        ctx = new AudioContext();
        const analisador = ctx.createAnalyser();
        analisador.fftSize = 1024;
        ctx.createMediaStreamSource(stream).connect(analisador);
        const dados = new Uint8Array(analisador.fftSize);
        const laco = () => {
          analisador.getByteTimeDomainData(dados);
          let soma = 0;
          for (const v of dados) soma += ((v - 128) / 128) ** 2;
          const rms = Math.sqrt(soma / dados.length);
          setNivel(Math.min(1, rms * 4));
          raf = requestAnimationFrame(laco);
        };
        laco();
      } catch {
        if (!cancelado) setErro("Não consegui abrir o microfone. Confira a permissão no passo anterior.");
      }
    })();

    return () => {
      cancelado = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      void ctx?.close();
      setNivel(0);
    };
  }, [microfoneId, ativo]);

  return { nivel, erro };
}
