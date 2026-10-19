// Recebe do processo principal o que mostrar e o que fazer com o microfone.
import { useEffect, useState } from "react";
import type { EstadoPilula } from "@shared/ipc";
import { apiPilula } from "../api/ponte";
import { tocar } from "../lib/sons";
import { useGravador } from "./useGravador";
import { useListaMicrofones } from "./useListaMicrofones";

export function useComandosPilula() {
  const [estado, setEstado] = useState<EstadoPilula>({ estado: "oculta" });
  const gravador = useGravador({ aoMicrofoneMudo: () => apiPilula.acao("microfone-mudo") });
  const { iniciar, parar, cancelar } = gravador;
  const atualizarMicrofones = useListaMicrofones();

  useEffect(() => apiPilula.aoEstado(setEstado), []);

  useEffect(
    () =>
      apiPilula.aoComando((c) => {
        if (c.acao === "iniciar") {
          if (c.sons) tocar("inicio");
          // Falha ao abrir o microfone é devolvida pelo "parar".
          // Com o microfone liberado os nomes aparecem: atualiza a lista do menu da barra.
          iniciar(c.sessao, c.microfoneId).then(atualizarMicrofones, () => {});
        } else if (c.acao === "parar") {
          if (c.sons) tocar("fim");
          void parar(c.sessao).then((a) => apiPilula.enviarAudio(a));
        } else {
          if (c.sons) tocar("cancelar");
          // Esc/✕: devolve o áudio para o processo principal guardar como "cancelado".
          if (c.devolverAudio) void parar(c.sessao).then((a) => apiPilula.enviarAudio(a));
          else void cancelar();
        }
      }),
    [iniciar, parar, cancelar, atualizarMicrofones],
  );

  return { estado, nivel: gravador.nivel };
}
