import { useEffect, useState } from "react";
import type { Preferencias } from "@shared/ipc";

export function usePreferencias(): Preferencias | null {
  const [p, setP] = useState<Preferencias | null>(null);
  useEffect(() => {
    void window.ponte.preferencias.ler().then(setP);
    return window.ponte.preferencias.aoMudar(setP);
  }, []);
  return p;
}
