import { useEffect, useState } from "react";
import type { InfoSistema } from "@shared/ipc";
import { apiSistema } from "../api/ponte";

export function useInfoSistema() {
  const [info, setInfo] = useState<InfoSistema | null>(null);
  useEffect(() => {
    void apiSistema.info().then(setInfo);
  }, []);
  return info;
}
