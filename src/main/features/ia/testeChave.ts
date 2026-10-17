// Botão "Testar" da tela de configurações. Três etapas, na ordem:
// 1) texto: confirma que a chave e o modelo do provedor funcionam;
// 2) transcrição (só se o modelo NÃO ouve áudio): o serviço escolhido transcreve a amostra;
// 3) áudio: o caminho completo do ditado com a amostra. Com 1 chamada, tenta os dois formatos de
//    áudio e guarda o que funcionou (é ele que o ditado usa).
import { readFileSync } from "node:fs";
import { PALAVRA_CHAVE_AMOSTRA } from "@shared/config";
import type { FormatoAudio, ResultadoEtapa, ResultadoTesteIa } from "@shared/ipc";
import { modeloTranscricaoPadrao, PROVEDORES, TRANSCRICOES } from "@shared/provedores";
import { caminhoRecurso } from "../../lib/recursos";
import { lerChave } from "../chaves";
import { lerPreferencias, salvarPreferencias } from "../preferencias";
import {
  chamarChat,
  ERRO_SEM_SERVICO_TRANSCRICAO,
  erroSemChave,
  modeloDoProvedor,
  ouveAudioNoMotor,
  servicoDeTranscricao,
} from "./motor";
import { transcrever } from "./provedores/transcricao";
import { transcreverERefinar } from "./transcrever";

const ORDEM_FORMATOS: FormatoAudio[] = ["input_audio", "file"];

function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export async function testarIa(): Promise<ResultadoTesteIa> {
  const prefs = lerPreferencias();
  const provedor = prefs.provedor;
  const nomeProvedor = PROVEDORES[provedor].nome;
  const modelo = modeloDoProvedor(prefs);
  const chave = lerChave(provedor);
  if (!chave) {
    return { texto: { ok: false, mensagem: erroSemChave(nomeProvedor), ms: 0 }, transcricao: null, audio: null };
  }

  // 1) Texto
  const rTexto = await chamarChat({
    provedor,
    chave,
    modelo,
    mensagens: [{ role: "user", content: "Responda apenas com a palavra: ok" }],
    timeoutMs: 20_000,
  });
  const texto: ResultadoEtapa = rTexto.ok
    ? { ok: true, mensagem: `Chave e modelo funcionando (${modelo}).`, ms: rTexto.ms, resposta: rTexto.texto }
    : { ok: false, mensagem: rTexto.erro, ms: rTexto.ms };
  if (!texto.ok) return { texto, transcricao: null, audio: null };

  let wav: Buffer;
  try {
    wav = readFileSync(caminhoRecurso("amostra-teste.wav"));
  } catch {
    const falha = { ok: false, mensagem: "Amostra de áudio não encontrada no app.", ms: 0 };
    return { texto, transcricao: null, audio: { ...falha, formato: null } };
  }

  // 2) Transcrição, quando o modelo não ouve áudio
  let transcricao: ResultadoEtapa | null = null;
  const duasChamadas = !ouveAudioNoMotor(provedor, modelo);
  if (duasChamadas) {
    transcricao = await testarTranscricao(wav);
    if (!transcricao.ok) return { texto, transcricao, audio: null };
  }

  // 3) Caminho completo do ditado
  if (duasChamadas) {
    const r = await transcreverERefinar(wav);
    const audio =
      r.ok && normalizar(r.texto).includes(PALAVRA_CHAVE_AMOSTRA)
        ? { ok: true, mensagem: "Transcrição e limpeza funcionando.", ms: r.ms, resposta: r.texto, formato: null }
        : {
            ok: false,
            mensagem: r.ok ? `A IA respondeu sem o texto esperado ("${r.texto.slice(0, 80)}").` : r.erro,
            ms: r.ms,
            formato: null,
          };
    return { texto, transcricao, audio };
  }

  const falhas: string[] = [];
  let ms = 0;
  for (const formato of ORDEM_FORMATOS) {
    const r = await transcreverERefinar(wav, formato);
    ms += r.ms;
    if (r.ok && normalizar(r.texto).includes(PALAVRA_CHAVE_AMOSTRA)) {
      salvarPreferencias({ formatoAudio: formato });
      return {
        texto,
        transcricao,
        audio: { ok: true, mensagem: `A IA entende áudio (formato "${formato}").`, ms: r.ms, resposta: r.texto, formato },
      };
    }
    falhas.push(r.ok ? `${formato}: respondeu sem transcrever ("${r.texto.slice(0, 80)}")` : `${formato}: ${r.erro}`);
  }

  salvarPreferencias({ formatoAudio: null });
  return {
    texto,
    transcricao,
    audio: { ok: false, mensagem: `Este modelo/gateway não transcreveu o áudio. ${falhas.join(" · ")}`, ms, formato: null },
  };
}

/** Etapa 2: o serviço de transcrição escolhido transcreve a amostra (deve conter "ditado"). */
async function testarTranscricao(wav: Buffer): Promise<ResultadoEtapa> {
  const prefs = lerPreferencias();
  const servico = servicoDeTranscricao(prefs);
  if (!servico) return { ok: false, mensagem: ERRO_SEM_SERVICO_TRANSCRICAO, ms: 0 };
  const info = TRANSCRICOES[servico];
  const chave = lerChave(info.chave);
  if (!chave) return { ok: false, mensagem: erroSemChave(info.nome), ms: 0 };
  const modelo = prefs.modeloPorTranscricao[servico] || modeloTranscricaoPadrao(servico);

  const r = await transcrever(servico, wav, { chave, modelo, idiomas: prefs.idiomas, termos: [], timeoutMs: 30_000 });
  if (!r.ok) return { ok: false, mensagem: r.erro, ms: r.ms };
  if (!normalizar(r.texto).includes(PALAVRA_CHAVE_AMOSTRA)) {
    return { ok: false, mensagem: `${info.nome} respondeu, mas sem o texto esperado ("${r.texto.slice(0, 80)}").`, ms: r.ms, resposta: r.texto };
  }
  return { ok: true, mensagem: `${info.nome} transcreveu a amostra (${modelo}).`, ms: r.ms, resposta: r.texto };
}
