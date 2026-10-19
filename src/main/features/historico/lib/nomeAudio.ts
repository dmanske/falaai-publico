// Nome sugerido ao baixar o áudio de um ditado: "FalaAi 2026-10-18 14h05.wav" (hora local).
import { NOME_APP } from "../../../../shared/config.ts";

export function nomeArquivoAudio(criadoEmIso: string): string {
  const d = new Date(criadoEmIso);
  const dois = (n: number) => String(n).padStart(2, "0");
  return `${NOME_APP} ${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())} ${dois(d.getHours())}h${dois(d.getMinutes())}.wav`;
}
