// Preferências do usuário (modelo de IA, formato de áudio descoberto no teste…).
import { MODELO_PADRAO } from "@shared/config";
import type { Preferencias } from "@shared/ipc";
import { gravarJson, lerJson } from "../../lib/arquivoJson";

const ARQUIVO = "preferencias.json";
const PADRAO: Preferencias = { modelo: MODELO_PADRAO, formatoAudio: null };

export function lerPreferencias(): Preferencias {
  return lerJson(ARQUIVO, PADRAO);
}

export function salvarPreferencias(parcial: Partial<Preferencias>): Preferencias {
  const atual = lerPreferencias();
  const nova: Preferencias = { ...atual, ...parcial };
  // Trocar de modelo invalida o formato de áudio descoberto: precisa testar de novo.
  if (parcial.modelo && parcial.modelo !== atual.modelo && parcial.formatoAudio === undefined) {
    nova.formatoAudio = null;
  }
  nova.modelo = nova.modelo.trim() || MODELO_PADRAO;
  gravarJson(ARQUIVO, nova);
  return nova;
}
