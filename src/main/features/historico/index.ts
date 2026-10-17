// ESQUELETO — preenchido pelo agente de Histórico/Estatísticas. Assinaturas fixas (usadas pelo ditado).
import type { ItemHistorico, ModoDitado } from "@shared/ipc";

export interface NovoDitado {
  modo: ModoDitado;
  texto: string;
  textoSelecionado: string | null;
  duracaoMs: number;
  app: string | null;
  appId: string | null;
  url: string | null;
  status: "ok" | "erro";
  erro: string | null;
  /** WAV do ditado; guardado só se preferencias.guardarAudio. */
  wav: Buffer | null;
}

/** Cria as tabelas e agenda a limpeza por retenção. Chamado uma vez no início do app. */
export function iniciarHistorico(): void {}

/** Grava um ditado e avisa as janelas (CANAIS_HISTORICO.MUDOU). */
export function registrarDitado(_d: NovoDitado): ItemHistorico | null {
  return null;
}
