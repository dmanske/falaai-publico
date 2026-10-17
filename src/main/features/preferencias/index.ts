// Preferências do usuário. Valores padrão ficam aqui; quem precisa reagir a uma mudança
// (atalhos, Dock, tema…) assina com aoMudarPreferencias.
import { EventEmitter } from "node:events";
import { MODELO_PADRAO } from "@shared/config";
import { atalhosPadrao } from "@shared/atalhos";
import type { Preferencias } from "@shared/ipc";
import { gravarJson, lerJson } from "../../lib/arquivoJson";

const ARQUIVO = "preferencias.json";

const PADRAO: Preferencias = {
  modelo: MODELO_PADRAO,
  formatoAudio: null,
  usarContexto: true,
  sons: true,
  idiomas: ["pt-BR", "en"],
  idiomaTraducao: "en",
  idiomasTraducao: ["en", "es"],
  microfoneId: null,
  silenciarFundo: false,
  atalhos: atalhosPadrao(process.platform),
  aprenderCorrecoes: true,
  guardarAudio: true,
  retencaoDias: null,
  abrirComSistema: true,
  mostrarNoDock: true,
  tema: "sistema",
  onboardingConcluido: false,
};

const eventos = new EventEmitter<{ mudou: [nova: Preferencias, anterior: Preferencias] }>();

export function lerPreferencias(): Preferencias {
  const lidas = lerJson(ARQUIVO, PADRAO);
  // Atalhos salvos parcialmente (versão antiga) completam com o padrão.
  const prefs = { ...lidas, atalhos: { ...PADRAO.atalhos, ...lidas.atalhos } };
  // O destino atual sempre faz parte dos favoritos (e a lista nunca fica vazia).
  const favoritos = prefs.idiomasTraducao?.length ? prefs.idiomasTraducao : [prefs.idiomaTraducao];
  prefs.idiomasTraducao = favoritos.includes(prefs.idiomaTraducao) ? favoritos : [prefs.idiomaTraducao, ...favoritos];
  return prefs;
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
  eventos.emit("mudou", nova, atual);
  return nova;
}

/** Avisa quando as preferências mudam. Devolve a função que cancela o aviso. */
export function aoMudarPreferencias(cb: (nova: Preferencias, anterior: Preferencias) => void): () => void {
  eventos.on("mudou", cb);
  return () => eventos.off("mudou", cb);
}
