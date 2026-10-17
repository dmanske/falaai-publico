// Passo "afterSign" do electron-builder no Mac: assina o FalaAi.app de novo com o certificado local
// "FalaAi Local" (criado uma vez por scripts/criar-assinatura-mac.sh). Com o mesmo certificado em todo
// build, o macOS reconhece cada versão como o mesmo app e não esquece a permissão de Acessibilidade.
// Sem o certificado (outro Mac, CI), mantém a assinatura ad-hoc de antes e só avisa.
const { execFileSync } = require("node:child_process");
const { existsSync, readFileSync } = require("node:fs");
const { homedir } = require("node:os");
const { join } = require("node:path");

const NOME = "FalaAi Local";
const CHAVEIRO = join(homedir(), "Library/Keychains/falaai-assinatura.keychain-db");
const ARQUIVO_SENHA = join(homedir(), ".config/falaai/assinatura-senha");

function rodar(cmd, args) {
  return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

exports.default = async function assinarMac(contexto) {
  if (contexto.electronPlatformName !== "darwin") return;
  if (!existsSync(CHAVEIRO) || !existsSync(ARQUIVO_SENHA)) {
    console.log(`  • sem o certificado "${NOME}": fica a assinatura ad-hoc (rode scripts/criar-assinatura-mac.sh)`);
    return;
  }
  rodar("security", ["unlock-keychain", "-p", readFileSync(ARQUIVO_SENHA, "utf8").trim(), CHAVEIRO]);
  const sha1 = /SHA-1 hash: ([0-9A-F]{40})/.exec(rodar("security", ["find-certificate", "-c", NOME, "-Z", CHAVEIRO]))?.[1];
  if (!sha1) throw new Error(`Certificado "${NOME}" não encontrado em ${CHAVEIRO}`);

  const app = join(contexto.appOutDir, `${contexto.packager.appInfo.productFilename}.app`);
  const assinar = (alvo, ...extra) =>
    rodar("codesign", ["--force", ...extra, "--sign", sha1, "--keychain", CHAVEIRO, "--timestamp=none", alvo]);
  // O auxiliar fica em Resources/bin (o --deep não entra lá): assina antes, depois o app inteiro.
  assinar(join(app, "Contents/Resources/bin/falaai-auxiliar-mac"));
  assinar(app, "--deep");
  rodar("codesign", ["--verify", "--deep", "--strict", app]);
  console.log(`  • assinado com "${NOME}" (${sha1.slice(0, 8)}…)`);
};
