// Comando de voz "enviar": a fala termina com uma ordem de envio dita sozinha
// ("…tudo certo? Enviar." / "…pode verificar, manda."). Daniel, 17/10/2026: "tem como fazer algo
// pra ele enviar a mensagem assim que eu terminar de falar, automaticamente?"
// Só vale quando o comando é a ÚLTIMA frase sozinha (depois de . ! ? …) ou vem depois de vírgula:
// "Amanhã eu vou enviar." NÃO dispara (a palavra faz parte da frase). Sem imports: testável.

/** Palavras de envio aceitas (pt e en — no modo tradução o texto pode sair em inglês). */
const COMANDOS = ["pode enviar", "pode mandar", "enviar", "envia", "envie", "manda", "mandar", "send it", "send"];

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const RE_COMANDO = new RegExp(
  `(^|[.!?…]\\s+|,\\s*)(${COMANDOS.map(escapar).join("|")})[.!]?\\s*$`,
  "i",
);

export interface ResultadoComandoEnviar {
  /** O texto a colar, sem o comando. */
  texto: string;
  /** A pessoa pediu para enviar. */
  enviar: boolean;
}

export function extrairComandoEnviar(texto: string): ResultadoComandoEnviar {
  const m = RE_COMANDO.exec(texto.trimEnd());
  if (!m) return { texto, enviar: false };
  let resto = texto.trimEnd().slice(0, m.index + m[1].length);
  // Tira a vírgula que sobrou ("…verificar, manda." → "…verificar.") e fecha a frase se precisar.
  resto = resto.replace(/,\s*$/, "").trimEnd();
  if (resto && !/[.!?…:)"”»]$/.test(resto)) resto += ".";
  return { texto: resto, enviar: true };
}
