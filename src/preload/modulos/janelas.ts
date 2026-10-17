// Ponte das janelas: pílula, hub (navegação), onboarding e cartão de resposta.
import { ipcRenderer } from "electron";
import { CANAIS_JANELAS, CANAIS_PILULA, type PonteJanelas, type PontePilula } from "@shared/ipc";
import { invocar, ouvir } from "../lib";

export const pontePilula: PontePilula = {
  aoComando: (cb) => ouvir(CANAIS_PILULA.COMANDO, cb),
  aoEstado: (cb) => ouvir(CANAIS_PILULA.ESTADO, cb),
  enviarAudio: (a) => ipcRenderer.send(CANAIS_PILULA.AUDIO, a),
  acao: (acao) => ipcRenderer.send(CANAIS_PILULA.ACAO, acao),
};

export const ponteJanelas: PonteJanelas = {
  abrirHub: (pagina) => invocar(CANAIS_JANELAS.ABRIR_HUB, pagina),
  aoNavegar: (cb) => ouvir(CANAIS_JANELAS.NAVEGAR, cb),
  concluirOnboarding: () => invocar(CANAIS_JANELAS.CONCLUIR_ONBOARDING),
  aoConteudoCartao: (cb) => ouvir(CANAIS_JANELAS.CARTAO_CONTEUDO, cb),
  fecharCartao: () => ipcRenderer.send(CANAIS_JANELAS.CARTAO_FECHAR),
};
