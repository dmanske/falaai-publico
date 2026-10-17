#!/bin/bash
# Cria (uma vez por Mac) o certificado local "FalaAi Local" usado para assinar o FalaAi.app.
# Por quê: com a assinatura ad-hoc cada build tem uma "identidade" nova e o macOS esquece a permissão
# de Acessibilidade. Assinando sempre com o mesmo certificado, as permissões valem para todas as versões.
# Fica num chaveiro só do FalaAi (não mexe no chaveiro de login); a senha dele é aleatória e fica em
# ~/.config/falaai/assinatura-senha (fora do git). Uso: bash scripts/criar-assinatura-mac.sh
set -euo pipefail

NOME="FalaAi Local"
PASTA="$HOME/.config/falaai"
CHAVEIRO="$HOME/Library/Keychains/falaai-assinatura.keychain-db"

if [ -f "$CHAVEIRO" ]; then
  echo "O certificado já existe ($CHAVEIRO). Nada a fazer."
  exit 0
fi

mkdir -p "$PASTA"
chmod 700 "$PASTA"
SENHA=$(openssl rand -hex 24)
printf %s "$SENHA" > "$PASTA/assinatura-senha"
chmod 600 "$PASTA/assinatura-senha"

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# Certificado autoassinado para assinatura de código, válido por 10 anos.
openssl req -x509 -newkey rsa:2048 -nodes -days 3650 -subj "/CN=$NOME" \
  -keyout "$TMP/chave.pem" -out "$TMP/cert.pem" \
  -addext "basicConstraints=critical,CA:false" \
  -addext "keyUsage=critical,digitalSignature" \
  -addext "extendedKeyUsage=critical,codeSigning" 2>/dev/null
# PKCS#12 em formato antigo (3DES/SHA1): é o que o "security import" do macOS aceita.
openssl pkcs12 -export -inkey "$TMP/chave.pem" -in "$TMP/cert.pem" -name "$NOME" -out "$TMP/cert.p12" \
  -keypbe PBE-SHA1-3DES -certpbe PBE-SHA1-3DES -macalg sha1 -passout "pass:$SENHA"

security create-keychain -p "$SENHA" "$CHAVEIRO"
security set-keychain-settings "$CHAVEIRO" # sem bloqueio automático
security unlock-keychain -p "$SENHA" "$CHAVEIRO"
security import "$TMP/cert.p12" -k "$CHAVEIRO" -P "$SENHA" -T /usr/bin/codesign >/dev/null
# Deixa o codesign usar a chave sem perguntar.
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$SENHA" "$CHAVEIRO" >/dev/null

echo "Certificado \"$NOME\" criado em $CHAVEIRO"
security find-certificate -c "$NOME" -Z "$CHAVEIRO" | grep SHA-1
