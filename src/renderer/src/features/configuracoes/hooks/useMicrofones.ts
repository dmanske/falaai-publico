import { useEffect, useState } from "react";

export interface Microfone {
  id: string;
  nome: string;
}

/** Lista de microfones; atualiza quando um é ligado/desligado. */
export function useMicrofones(): Microfone[] {
  const [lista, setLista] = useState<Microfone[]>([]);

  useEffect(() => {
    let vivo = true;
    async function ler() {
      try {
        let dispositivos = await navigator.mediaDevices.enumerateDevices();
        let entradas = dispositivos.filter((d) => d.kind === "audioinput");
        // Sem permissão os nomes vêm vazios: abre e fecha o microfone uma vez para liberá-los.
        if (entradas.length > 0 && entradas.every((d) => !d.label)) {
          try {
            const s = await navigator.mediaDevices.getUserMedia({ audio: true });
            s.getTracks().forEach((t) => t.stop());
            dispositivos = await navigator.mediaDevices.enumerateDevices();
            entradas = dispositivos.filter((d) => d.kind === "audioinput");
          } catch {
            /* sem permissão: segue com nomes genéricos */
          }
        }
        if (vivo)
          setLista(
            entradas
              .filter((d) => d.deviceId !== "default" && d.deviceId !== "communications")
              .map((d, i) => ({ id: d.deviceId, nome: d.label || `Microfone ${i + 1}` })),
          );
      } catch {
        if (vivo) setLista([]);
      }
    }
    void ler();
    navigator.mediaDevices.addEventListener("devicechange", ler);
    return () => {
      vivo = false;
      navigator.mediaDevices.removeEventListener("devicechange", ler);
    };
  }, []);

  return lista;
}
