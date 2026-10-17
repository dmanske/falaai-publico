// Formatos de áudio aceitos nas mensagens de chat (caminho de 1 chamada) e limpeza da resposta.
import type { FormatoAudio } from "@shared/ipc";
import { MARCA_SEM_FALA } from "./prompts";
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
