// Converte o texto do ditado (com "- " e "1." das listas) em HTML, para colar listas de verdade
// em apps que aceitam texto formatado (Notas, Mail, Gmail, Notion…). Sem lista, não há o que formatar.

const ITEM_MARCADOR = /^\s*[-•]\s+(.*)$/;
const ITEM_NUMERADO = /^\s*\d+[.)]\s+(.*)$/;

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const escapar = (t: string) => t.replace(/[&<>"]/g, (c) => ESCAPES[c]);

type Linha = { tipo: "ul" | "ol"; texto: string } | { tipo: "texto"; texto: string };

function classificar(linha: string): Linha {
  const m = ITEM_MARCADOR.exec(linha);
  if (m) return { tipo: "ul", texto: m[1] };
  const n = ITEM_NUMERADO.exec(linha);
  if (n) return { tipo: "ol", texto: n[1] };
  return { tipo: "texto", texto: linha.trim() };
}

/** HTML do texto, ou `null` se ele não tem nenhuma lista (aí vale colar o texto normal). */
export function textoParaHtml(texto: string): string | null {
  let temLista = false;
  const saida: string[] = [];

  for (const paragrafo of texto.split(/\n[ \t]*\n/)) {
    const linhas = paragrafo.split("\n").filter((l) => l.trim() !== "").map(classificar);
    let i = 0;
    while (i < linhas.length) {
      const atual = linhas[i];
      // Junta os itens seguidos do mesmo tipo (ou as linhas de texto seguidas) num só bloco.
      let fim = i;
      while (fim < linhas.length && linhas[fim].tipo === atual.tipo) fim++;
      const grupo = linhas.slice(i, fim).map((l) => escapar(l.texto));
      if (atual.tipo === "texto") {
        saida.push(`<p>${grupo.join("<br>")}</p>`);
      } else {
        temLista = true;
        saida.push(`<${atual.tipo}>${grupo.map((t) => `<li>${t}</li>`).join("")}</${atual.tipo}>`);
      }
      i = fim;
    }
  }
  return temLista ? saida.join("") : null;
}
