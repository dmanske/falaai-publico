// Áudio → texto limpo, numa chamada só (caminho A: o modelo transcreve e refina).
// Usado pelo ditado e pelo botão "Testar chave", para o teste cobrir o caminho real.
import type { FormatoAudio } from "@shared/ipc";
import { lerChave } from "../chaves";
import { lerPreferencias } from "../preferencias";
import { chamarLovable } from "./api/lovable";
import { MARCA_SEM_FALA, PROMPT_DITADO } from "./prompts";
import type { ParteConteudo } from "./types";

export function parteAudio(formato: FormatoAudio, wavBase64: string): ParteConteudo {
  return formato === "input_audio"
    ? { type: "input_audio", input_audio: { data: wavBase64, format: "wav" } }
    : { type: "file", file: { filename: "ditado.wav", file_data: `data:audio/wav;base64,${wavBase64}` } };
}

/** Tira aspas, cercas de código e a marca de "sem fala" que a IA às vezes devolve. */
export function limparResposta(texto: string): string {
  let t = texto.trim();
  t = t.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "").trim();
  if (/^["“].*["”]$/s.test(t)) t = t.slice(1, -1).trim();
  return t === MARCA_SEM_FALA ? "" : t;
}

export type ResultadoTranscricao =
  | { ok: true; texto: string; ms: number }
  | { ok: false; erro: string; ms: number };

export async function transcreverERefinar(
  wav: Buffer,
  formatoForcado?: FormatoAudio,
): Promise<ResultadoTranscricao> {
  const chave = lerChave("lovable");
  if (!chave) return { ok: false, erro: "Sem chave da Lovable. Abra as Configurações.", ms: 0 };
  const { modelo, formatoAudio } = lerPreferencias();
  const r = await chamarLovable({
    chave,
    modelo,
    mensagens: [
      { role: "system", content: PROMPT_DITADO },
      {
        role: "user",
        content: [
          { type: "text", text: "Transcreva e limpe este ditado." },
          parteAudio(formatoForcado ?? formatoAudio ?? "input_audio", wav.toString("base64")),
        ],
      },
    ],
  });
  return r.ok ? { ok: true, texto: limparResposta(r.texto), ms: r.ms } : { ok: false, erro: r.erro, ms: r.ms };
}
