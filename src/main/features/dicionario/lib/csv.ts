// Leitura de listas para importar: uma palavra por linha OU primeira coluna de um CSV
// (separador , ; ou tab; campos entre aspas). Função pura.
import { validarTermo } from "./termo.ts";

const CABECALHOS = new Set(["palavra", "palavras", "termo", "termos", "word", "words", "term", "terms"]);

/** Primeira coluna de cada registro (linha). Linhas totalmente em branco são descartadas. */
function primeirasColunas(texto: string): string[] {
  const saida: string[] = [];
  let campo = "";
  let primeiroLido = false; // já terminou a 1ª coluna deste registro
  let entreAspas = false;
  let registroVazio = true;

  const fecharRegistro = () => {
    if (!registroVazio) saida.push(campo);
    campo = "";
    primeiroLido = false;
    registroVazio = true;
  };

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (entreAspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          if (!primeiroLido) campo += '"';
          i++;
        } else entreAspas = false;
      } else if (!primeiroLido) campo += c;
      continue;
    }
    if (c === '"') {
      entreAspas = true;
      registroVazio = false;
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      fecharRegistro();
    } else if (c === "," || c === ";" || c === "\t") {
      if (!primeiroLido) primeiroLido = true;
      registroVazio = false;
    } else {
      if (c.trim() !== "") registroVazio = false;
      if (!primeiroLido) campo += c;
    }
  }
  fecharRegistro();
  return saida;
}

export interface ListaLida {
  /** Termos válidos, sem repetição (ignora maiúsculas/minúsculas). */
  termos: string[];
  /** Vazios, inválidos e repetidos dentro do próprio arquivo. */
  ignoradas: number;
}

export function lerLista(conteudo: string): ListaLida {
  const texto = conteudo.replace(/^﻿/, "");
  const campos = primeirasColunas(texto);
  if (campos.length > 0 && CABECALHOS.has(campos[0].trim().toLowerCase())) campos.shift();

  const vistos = new Set<string>();
  const termos: string[] = [];
  let ignoradas = 0;
  for (const bruto of campos) {
    const r = validarTermo(bruto);
    if ("erro" in r) {
      ignoradas++;
      continue;
    }
    const chave = r.termo.toLowerCase();
    if (vistos.has(chave)) {
      ignoradas++;
      continue;
    }
    vistos.add(chave);
    termos.push(r.termo);
  }
  return { termos, ignoradas };
}
