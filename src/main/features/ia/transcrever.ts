// Áudio → texto limpo do ditado (usado pelo histórico/reprocessar e pelo teste da chave).
// Segue o mesmo roteamento do modo ditado (motor.ts): 1 ou 2 chamadas.
import type { FormatoAudio } from "@shared/ipc";
import { executarPedidoIa } from "./motor";
import { limparResposta } from "./audio";
import { blocoContexto, MARCA_SEM_FALA, mensagemTranscricao, PROMPT_DITADO } from "./prompts";
import { palavrasParaPrompt } from "../dicionario";
import { lerPreferencias } from "../preferencias";

export { limparResposta, parteAudio } from "./audio";

export type ResultadoTranscricao =
  | { ok: true; texto: string; ms: number }
  | { ok: false; erro: string; ms: number };

export async function transcreverERefinar(wav: Buffer, formatoForcado?: FormatoAudio): Promise<ResultadoTranscricao> {
  const idiomas = lerPreferencias().idiomas;
  const dicionario = palavrasParaPrompt();
  const r = await executarPedidoIa({
    sistema: PROMPT_DITADO + blocoContexto({ app: null, janela: null, url: null, placeholder: null, antes: "", depois: "", idiomas, dicionario }),
    instrucaoAudio: "Transcreva e limpe este ditado.",
    instrucaoTexto: mensagemTranscricao,
    wav,
    idiomas,
    termos: dicionario,
    formatoForcado,
  });
  if (!r.ok) return r;
  return { ok: true, texto: r.semFala || r.texto.trim() === MARCA_SEM_FALA ? "" : limparResposta(r.texto), ms: r.ms };
}
