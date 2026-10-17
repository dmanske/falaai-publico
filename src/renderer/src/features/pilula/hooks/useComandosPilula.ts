// Recebe do processo principal o que mostrar e o que fazer com o microfone.
import { useEffect, useState } from "react";
import type { EstadoPilula } from "@shared/ipc";
import { apiPilula } from "../api/ponte";
import { tocar } from "../lib/sons";
import { useGravador } from "./useGravador";

export function useComandosPilula() {
  const [estado, setEstado] = useState<EstadoPilula>({ estado: "oculta" });
  const gravador = useGravador();
  const { iniciar, parar, cancelar } = gravador;

  useEffect(() => apiPilula.aoEstado(setEstado), []);

  useEffect(
    () =>
      apiPilula.aoComando((c) => {
        if (c.acao === "iniciar") {
          if (c.sons) tocar("inicio");
          // Falha ao abrir o microfone é devolvida pelo "parar".
          iniciar(c.sessao, c.microfoneId).catch(() => {});
        } else if (c.acao === "parar") {
          if (c.sons) tocar("fim");
          void parar(c.sessao).then((a) => apiPilula.enviarAudio(a));
        } else {
          if (c.sons) tocar("cancelar");
          void cancelar();
        }
      }),
    [iniciar, parar, cancelar],
  );

  return { estado, nivel: gravador.nivel };
}
