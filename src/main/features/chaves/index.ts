// Chaves de API guardadas criptografadas pelo sistema (safeStorage: Keychain no Mac, DPAPI no
// Windows). O arquivo chaves.json só tem o texto cifrado; a tela nunca recebe a chave inteira.
import { safeStorage } from "electron";
import type { NomeChave, StatusChave } from "@shared/ipc";
import { gravarJson, lerJson } from "../../lib/arquivoJson";
import { limparChave } from "./lib/limparChave";

const ARQUIVO = "chaves.json";
type Cofre = Partial<Record<NomeChave, string>>;

function lerCofre(): Cofre {
  return lerJson<Cofre>(ARQUIVO, {});
}

export function lerChave(nome: NomeChave): string | null {
  const cifrada = lerCofre()[nome];
  if (!cifrada) return null;
  try {
    // Limpa também ao ler: uma chave salva antes da limpeza volta a funcionar sem colar de novo.
    return limparChave(safeStorage.decryptString(Buffer.from(cifrada, "base64"))) || null;
  } catch {
    return null;
  }
}

export function statusChave(nome: NomeChave): StatusChave {
  const valor = lerChave(nome);
  return { configurada: !!valor, final: valor ? valor.slice(-4) : null };
}

export function salvarChave(nome: NomeChave, valor: string): StatusChave {
  const limpa = limparChave(valor);
  if (!limpa) return apagarChave(nome);
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("O sistema não liberou a criptografia para guardar a chave.");
  }
  const cofre = lerCofre();
  cofre[nome] = safeStorage.encryptString(limpa).toString("base64");
  gravarJson(ARQUIVO, cofre);
  return statusChave(nome);
}

export function apagarChave(nome: NomeChave): StatusChave {
  const cofre = lerCofre();
  delete cofre[nome];
  gravarJson(ARQUIVO, cofre);
  return statusChave(nome);
}
