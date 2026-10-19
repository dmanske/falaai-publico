// Entradas de áudio e teclados vistos pelo auxiliar do Mac (protocolo v4). Só informativo:
// qualquer falha (Windows v3 responde "Comando desconhecido", auxiliar caído) devolve null, sem erro.
import type { DispositivosAudio, TecladoConectado } from "@shared/ipc";
import { auxiliar } from "../../nativo";

const MAX_ITENS = 50;
const MAX_TEXTO = 120;

export async function lerDispositivosAudio(): Promise<DispositivosAudio | null> {
  if (process.platform !== "darwin") return null;
  const r = await auxiliar.enviar({ cmd: "dispositivos_audio" });
  if (!r.ok || !Array.isArray(r.entradas)) return null;
  const entradas: DispositivosAudio["entradas"] = [];
  for (const e of r.entradas.slice(0, MAX_ITENS) as Record<string, unknown>[]) {
    if (!e || typeof e.nome !== "string" || !e.nome) continue;
    entradas.push({
      nome: e.nome.slice(0, MAX_TEXTO),
      uid: typeof e.uid === "string" ? e.uid : "",
      transporte: typeof e.transporte === "string" ? e.transporte : "desconhecido",
      padrao: e.padrao === true,
      vivo: e.vivo !== false,
    });
  }
  return { entradas, tampaFechada: typeof r.tampaFechada === "boolean" ? r.tampaFechada : null };
}

export async function lerTeclados(): Promise<TecladoConectado[] | null> {
  if (process.platform !== "darwin") return null;
  const r = await auxiliar.enviar({ cmd: "teclados" });
  if (!r.ok || !Array.isArray(r.teclados)) return null;
  return (r.teclados.slice(0, MAX_ITENS) as Record<string, unknown>[])
    .filter((t) => t && typeof t.nome === "string" && t.nome)
    .map((t) => ({ nome: (t.nome as string).slice(0, MAX_TEXTO), embutido: t.embutido === true }));
}
