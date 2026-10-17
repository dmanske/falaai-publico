import { useCallback, useEffect, useRef, useState } from "react";
import { apiHistorico } from "../api/ponte";

/** Toca o áudio de um ditado. Só um por vez: tocar outro para o anterior. */
export function useOuvirAudio() {
  const [tocandoId, setTocandoId] = useState<string | null>(null);
  const [carregandoId, setCarregandoId] = useState<string | null>(null);
  const [erro, setErro] = useState<{ id: string; mensagem: string } | null>(null);
  const player = useRef<{ audio: HTMLAudioElement; url: string } | null>(null);

  const parar = useCallback(() => {
    if (player.current) {
      player.current.audio.pause();
      URL.revokeObjectURL(player.current.url);
      player.current = null;
    }
    setTocandoId(null);
  }, []);

  const alternar = useCallback(
    async (id: string) => {
      if (player.current && tocandoId === id) return parar();
      parar();
      setErro(null);
      setCarregandoId(id);
      try {
        const wav = await apiHistorico.audio(id);
        if (!wav) {
          setErro({ id, mensagem: "Áudio não encontrado." });
          return;
        }
        const url = URL.createObjectURL(new Blob([wav], { type: "audio/wav" }));
        const audio = new Audio(url);
        player.current = { audio, url };
        audio.onended = () => {
          if (player.current?.audio === audio) parar();
        };
        await audio.play();
        setTocandoId(id);
      } catch (e) {
        parar();
        setErro({ id, mensagem: (e as Error).message || "Não consegui tocar o áudio." });
      } finally {
        setCarregandoId(null);
      }
    },
    [parar, tocandoId],
  );

  useEffect(() => parar, [parar]);

  return { tocandoId, carregandoId, erro, alternar };
}
