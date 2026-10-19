// Lista os microfones e avisa o processo principal (que monta o submenu "Microfone" da barra de menus).
import { useCallback, useEffect, useRef } from "react";
import type { MicrofoneListado } from "@shared/ipc";
import { apiPilula } from "../api/ponte";

/** Entradas virtuais do Chromium que repetem outro microfone. */
const VIRTUAIS = new Set(["default", "communications"]);

/** Lê ao carregar e quando um microfone entra ou sai; devolve a função para ler de novo na hora. */
export function useListaMicrofones(): () => void {
  const ultima = useRef("");

  const atualizar = useCallback(() => {
    navigator.mediaDevices
      .enumerateDevices()
      .then((dispositivos) => {
        const lista: MicrofoneListado[] = dispositivos
          .filter((d) => d.kind === "audioinput" && !VIRTUAIS.has(d.deviceId))
          .map((d) => ({ id: d.deviceId, nome: d.label }));
        // Só avisa quando mudou, para não refazer o menu à toa.
        const chave = JSON.stringify(lista);
        if (chave === ultima.current) return;
        ultima.current = chave;
        apiPilula.enviarMicrofones(lista);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    atualizar();
    navigator.mediaDevices.addEventListener("devicechange", atualizar);
    return () => navigator.mediaDevices.removeEventListener("devicechange", atualizar);
  }, [atualizar]);

  return atualizar;
}
