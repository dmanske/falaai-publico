// Confere se o texto da IA cabe no áudio: ninguém fala dezenas de palavras por segundo. Quando não cabe,
// a IA inventou (20/10/2026: 0,84 s de áudio viraram 39 palavras sobre um assunto que estava na tela).
import { FOLGA_PALAVRAS, PALAVRAS_POR_SEGUNDO_MAX } from "../../../../shared/config.ts";
import { contarPalavras } from "../../historico/lib/contarPalavras.ts";

/** true = mais palavras do que dá para falar em `duracaoMs` de áudio. Sem duração, não decide nada. */
export function pareceInventado(texto: string, duracaoMs: number): boolean {
  if (!(duracaoMs > 0)) return false;
  const limite = Math.ceil((duracaoMs / 1000) * PALAVRAS_POR_SEGUNDO_MAX) + FOLGA_PALAVRAS;
  return contarPalavras(texto) > limite;
}
