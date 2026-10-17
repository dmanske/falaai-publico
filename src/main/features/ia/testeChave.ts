// Botão "Testar" da tela de configurações.
// 1) Texto: confirma que a chave e o modelo funcionam.
// 2) Áudio: manda a amostra resources/amostra-teste.wav e confere se a transcrição bate.
//    Tenta os dois formatos que gateways OpenAI-compatíveis costumam aceitar e guarda o que
//    funcionou nas preferências — é ele que o ditado vai usar.
import { readFileSync } from "node:fs";
import { PALAVRA_CHAVE_AMOSTRA } from "@shared/config";
import type { FormatoAudio, ResultadoEtapa, ResultadoTesteIa } from "@shared/ipc";
import { caminhoRecurso } from "../../lib/recursos";
import { lerChave } from "../chaves";
import { lerPreferencias, salvarPreferencias } from "../preferencias";
import { chamarLovable } from "./api/lovable";
import { transcreverERefinar } from "./transcrever";

const ORDEM_FORMATOS: FormatoAudio[] = ["input_audio", "file"];

function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export async function testarIa(): Promise<ResultadoTesteIa> {
  const chave = lerChave("lovable");
  if (!chave) {
    return { texto: { ok: false, mensagem: "Nenhuma chave da Lovable salva.", ms: 0 }, audio: null };
  }
  const { modelo } = lerPreferencias();

  const rTexto = await chamarLovable({
    chave,
    modelo,
    mensagens: [{ role: "user", content: "Responda apenas com a palavra: ok" }],
    timeoutMs: 20_000,
  });
  const texto: ResultadoEtapa = rTexto.ok
    ? { ok: true, mensagem: `Chave e modelo funcionando (${modelo}).`, ms: rTexto.ms, resposta: rTexto.texto }
    : { ok: false, mensagem: rTexto.erro, ms: rTexto.ms };
  if (!texto.ok) return { texto, audio: null };

  let wav: Buffer;
  try {
    wav = readFileSync(caminhoRecurso("amostra-teste.wav"));
  } catch {
    return { texto, audio: { ok: false, mensagem: "Amostra de áudio não encontrada no app.", ms: 0, formato: null } };
  }

  // Mesmo caminho do ditado (prompt de limpeza incluído).
  const falhas: string[] = [];
  let ms = 0;
  for (const formato of ORDEM_FORMATOS) {
    const r = await transcreverERefinar(wav, formato);
    ms += r.ms;
    if (r.ok && normalizar(r.texto).includes(PALAVRA_CHAVE_AMOSTRA)) {
      salvarPreferencias({ formatoAudio: formato });
      return {
        texto,
        audio: { ok: true, mensagem: `A IA entende áudio (formato "${formato}").`, ms: r.ms, resposta: r.texto, formato },
      };
    }
    falhas.push(r.ok ? `${formato}: respondeu sem transcrever ("${r.texto.slice(0, 80)}")` : `${formato}: ${r.erro}`);
  }

  salvarPreferencias({ formatoAudio: null });
  return {
    texto,
    audio: {
      ok: false,
      mensagem: `Este modelo/gateway não transcreveu o áudio. ${falhas.join(" · ")}`,
      ms,
      formato: null,
    },
  };
}
