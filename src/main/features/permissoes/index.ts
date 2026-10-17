// Status e pedido das permissões que o ditado precisa.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { shell, systemPreferences } from "electron";
import type { StatusPermissoes } from "@shared/ipc";
import { tecladoAtivo } from "../ditado/teclado";
import { auxiliar } from "../nativo";

const exec = promisify(execFile);

const AJUSTES_ACESSIBILIDADE = "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility";
const AJUSTES_MICROFONE = "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone";
const AJUSTES_TECLADO = "x-apple.systempreferences:com.apple.Keyboard-Settings.extension";

function statusMicrofone(): StatusPermissoes["microfone"] {
  if (process.platform !== "darwin" && process.platform !== "win32") return "desconhecida";
  const s = systemPreferences.getMediaAccessStatus("microphone");
  return (
    { granted: "concedida", denied: "negada", "not-determined": "nao-perguntada", restricted: "restrita" } as const
  )[s as "granted"] ?? "desconhecida";
}

/** Ajustes > Teclado > "Pressionar tecla 🌐 para": 0 nada, 1 idioma, 2 emoji, 3 ditado da Apple. */
async function teclaFnDoSistema(): Promise<StatusPermissoes["teclaFnDoSistema"]> {
  if (process.platform !== "darwin") return null;
  try {
    const { stdout } = await exec("defaults", ["read", "com.apple.HIToolbox", "AppleFnUsageType"]);
    return (["nada", "idioma", "emoji", "ditado"] as const)[Number(stdout.trim())] ?? null;
  } catch {
    return null; // nunca foi mudado: o padrão varia por modelo de Mac
  }
}

async function acessibilidade(pedir: boolean): Promise<boolean | null> {
  if (process.platform !== "darwin") return null;
  if (!auxiliar.disponivel) return null;
  const r = await auxiliar.enviar({ cmd: "permissoes", pedir });
  return r.ok ? Boolean(r.acessibilidade) : null;
}

export async function lerPermissoes(): Promise<StatusPermissoes> {
  return {
    plataforma: process.platform,
    microfone: statusMicrofone(),
    acessibilidade: await acessibilidade(false),
    tecladoAtivo: tecladoAtivo(),
    teclaFnDoSistema: await teclaFnDoSistema(),
    erroAuxiliar: auxiliar.erro,
  };
}

/** Pede a permissão ao sistema; se ela já foi negada, abre a tela certa dos Ajustes. */
export async function pedirPermissao(qual: "microfone" | "acessibilidade" | "ajustes-teclado"): Promise<StatusPermissoes> {
  if (process.platform === "darwin") {
    if (qual === "microfone") {
      if (statusMicrofone() === "nao-perguntada") await systemPreferences.askForMediaAccess("microphone");
      else await shell.openExternal(AJUSTES_MICROFONE);
    } else if (qual === "acessibilidade") {
      await acessibilidade(true);
      await shell.openExternal(AJUSTES_ACESSIBILIDADE);
    } else {
      await shell.openExternal(AJUSTES_TECLADO);
    }
  }
  return lerPermissoes();
}

/** Garante o microfone antes de gravar. No Windows o pedido acontece no próprio getUserMedia. */
export async function garantirMicrofone(): Promise<boolean> {
  if (process.platform !== "darwin") return true;
  const s = statusMicrofone();
  if (s === "concedida") return true;
  if (s === "nao-perguntada") return systemPreferences.askForMediaAccess("microphone");
  return false;
}
