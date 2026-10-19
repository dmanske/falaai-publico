import { useEffect, useState } from "react";
import type { DispositivosAudio } from "@shared/ipc";
import { apiSistema } from "../api/ponte";

/** Entradas do CoreAudio (tipo de cada microfone) e estado da tampa; null no Windows ou se falhar. */
export function useDispositivosAudio(): DispositivosAudio | null {
  const [dados, setDados] = useState<DispositivosAudio | null>(null);

  useEffect(() => {
    let vivo = true;
    const ler = () =>
      apiSistema
        .dispositivosAudio()
        .then((d) => vivo && setDados(d))
        .catch(() => vivo && setDados(null));
    void ler();
    navigator.mediaDevices.addEventListener("devicechange", ler);
    return () => {
      vivo = false;
      navigator.mediaDevices.removeEventListener("devicechange", ler);
    };
  }, []);

  return dados;
}
