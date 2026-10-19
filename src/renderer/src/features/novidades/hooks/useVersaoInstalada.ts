import { useEffect, useState } from "react";
import { apiPreferencias, apiSistema } from "../api/ponte";

/** Versão instalada (app.getVersion()). Ao abrir a página, marca as novidades dela como vistas. */
export function useVersaoInstalada(): string | null {
  const [versao, setVersao] = useState<string | null>(null);
  useEffect(() => {
    void apiSistema.info().then((info) => {
      setVersao(info.versao);
      void apiPreferencias.salvar({ novidadesVistas: info.versao });
    });
  }, []);
  return versao;
}
