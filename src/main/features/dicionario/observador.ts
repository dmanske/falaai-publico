// Depois de colar um ditado, observa o campo em foco e aprende palavras que o usuário corrigiu.
import { OBSERVAR_CORRECOES_MS } from "@shared/config";
import { auxiliar } from "../nativo";
import { lerPreferencias } from "../preferencias";
import { encontrarCorrecoes } from "./lib/correcoes";
import { avisarMudou, existe, inserir } from "./repositorio";

const INTERVALO_MS = 2000;
const MAX_FALHAS_SEGUIDAS = 3;

let parar: (() => void) | null = null;

export function observar(textoColado: string, appId: string | null, aoAprender: (termos: string[]) => void): void {
  parar?.(); // um ditado novo cancela a observação anterior
  try {
    if (!lerPreferencias().aprenderCorrecoes || !textoColado.trim()) return;
  } catch {
    return;
  }

  const fim = Date.now() + OBSERVAR_CORRECOES_MS;
  const jaAprendidos = new Set<string>();
  let falhas = 0;
  let ocupado = false;
  let encerrado = false;

  const encerrar = () => {
    encerrado = true;
    clearInterval(timer);
    if (parar === encerrar) parar = null;
  };
  parar = encerrar;

  const tick = async () => {
    if (ocupado || encerrado) return;
    ocupado = true;
    try {
      if (Date.now() > fim) return encerrar();
      const resp = await auxiliar.enviar({ cmd: "ler_campo" });
      if (encerrado) return;
      if (!resp.ok) {
        if (++falhas >= MAX_FALHAS_SEGUIDAS) encerrar();
        return;
      }
      falhas = 0;
      const texto = typeof resp.texto === "string" ? resp.texto : null;
      const app = typeof resp.appId === "string" ? resp.appId : null;
      if (texto === null) return encerrar();
      if (appId !== null && app !== appId) return encerrar();

      const r = encontrarCorrecoes(textoColado, texto);
      if (!r.localizado) return encerrar();

      const novos: string[] = [];
      for (const termo of r.termos) {
        const k = termo.toLowerCase();
        if (jaAprendidos.has(k)) continue;
        jaAprendidos.add(k);
        if (existe(termo)) continue;
        try {
          novos.push(inserir(termo, "aprendida").termo);
        } catch {
          // inválido ou repetido: ignora
        }
      }
      if (novos.length > 0) {
        avisarMudou();
        aoAprender(novos);
      }
    } catch (e) {
      console.error("[dicionario] observarEdicao:", e);
      encerrar();
    } finally {
      ocupado = false;
    }
  };

  const timer = setInterval(() => void tick(), INTERVALO_MS);
}
