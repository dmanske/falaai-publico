// Preferências do usuário. Valores padrão ficam aqui; quem precisa reagir a uma mudança
// (atalhos, Dock, tema…) assina com aoMudarPreferencias.
import { EventEmitter } from "node:events";
import { MODELO_PADRAO } from "@shared/config";
import { modeloPadrao, type IdProvedor } from "@shared/provedores";
import { atalhosPadrao } from "@shared/atalhos";
import type { Preferencias } from "@shared/ipc";
import { gravarJson, lerJson } from "../../lib/arquivoJson";

const ARQUIVO = "preferencias.json";

const PADRAO: Preferencias = {
  provedor: "lovable",
  modeloPorProvedor: { lovable: MODELO_PADRAO },
  modelo: MODELO_PADRAO,
  transcricao: null,
  modeloPorTranscricao: {},
  enviarNosApps: [],
  enviarPorVoz: true,
  formatoAudio: null,
  usarContexto: true,
  lerTela: true,
  copiarSelecao: true,
  colarFormatado: true,
  maosLivresComToqueDuplo: false,
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
  abrirJanelaAoIniciar: false,
  mostrarNoDock: true,
  tema: "sistema",
  fundo: "topo",
  estiloPilula: { tipo: "estilo", id: "original" },
  coresDoClubeNoApp: true,
  onboardingConcluido: false,
};

const eventos = new EventEmitter<{ mudou: [nova: Preferencias, anterior: Preferencias] }>();

export function lerPreferencias(): Preferencias {
  const lidas = lerJson(ARQUIVO, PADRAO);
  // Atalhos salvos parcialmente (versão antiga) completam com o padrão.
  const prefs = { ...lidas, atalhos: { ...PADRAO.atalhos, ...lidas.atalhos } };
  // Versões antigas só tinham `modelo` (da Lovable): vira o modelo da Lovable no mapa por provedor.
  prefs.modeloPorProvedor = { lovable: lidas.modelo || MODELO_PADRAO, ...lidas.modeloPorProvedor };
  prefs.modelo = prefs.modeloPorProvedor[prefs.provedor] ?? modeloPadrao(prefs.provedor);
  // O destino atual sempre faz parte dos favoritos (e a lista nunca fica vazia).
  const favoritos = prefs.idiomasTraducao?.length ? prefs.idiomasTraducao : [prefs.idiomaTraducao];
  prefs.idiomasTraducao = favoritos.includes(prefs.idiomaTraducao) ? favoritos : [prefs.idiomaTraducao, ...favoritos];
  return prefs;
}

export function salvarPreferencias(parcial: Partial<Preferencias>): Preferencias {
  const atual = lerPreferencias();
  const nova: Preferencias = { ...atual, ...parcial };
  const provedor: IdProvedor = nova.provedor;
  // `modelo` é sempre o do provedor atual: salvar um modelo grava no mapa; trocar de provedor
  // traz o modelo que estava escolhido nele (ou o recomendado).
  if (parcial.modelo !== undefined) {
    nova.modeloPorProvedor = { ...nova.modeloPorProvedor, [provedor]: parcial.modelo.trim() || modeloPadrao(provedor) };
  }
  nova.modelo = nova.modeloPorProvedor[provedor] ?? modeloPadrao(provedor);
  // Trocar de provedor ou de modelo invalida o formato de áudio descoberto: precisa testar de novo.
  if ((nova.provedor !== atual.provedor || nova.modelo !== atual.modelo) && parcial.formatoAudio === undefined) {
    nova.formatoAudio = null;
  }
  gravarJson(ARQUIVO, nova);
  eventos.emit("mudou", nova, atual);
  return nova;
}

/** Avisa quando as preferências mudam. Devolve a função que cancela o aviso. */
export function aoMudarPreferencias(cb: (nova: Preferencias, anterior: Preferencias) => void): () => void {
  eventos.on("mudou", cb);
  return () => eventos.off("mudou", cb);
}
