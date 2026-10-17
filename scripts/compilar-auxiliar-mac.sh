#!/usr/bin/env bash
# Compila o auxiliar nativo do macOS (binário universal arm64 + x86_64).
set -euo pipefail

cd "$(dirname "$0")/.."

FONTE="nativo/macos/main.swift"
SAIDA="resources/bin/falaai-auxiliar-mac"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p resources/bin

compilar() { # $1 = arquitetura
  swiftc -O -swift-version 5 -target "$1-apple-macos12" \
    -framework Cocoa -framework ApplicationServices -framework Carbon \
    "$FONTE" -o "$TMP/aux-$1"
}

ARQS=()
for a in arm64 x86_64; do
  if compilar "$a"; then
    ARQS+=("$TMP/aux-$a")
  else
    echo "AVISO: falha ao compilar para $a." >&2
  fi
done

if [ "${#ARQS[@]}" -eq 0 ]; then
  echo "ERRO: nenhuma arquitetura compilou." >&2
  exit 1
fi

if [ "${#ARQS[@]}" -lt 2 ]; then
  echo "AVISO: binário NÃO universal (só uma arquitetura)." >&2
fi

lipo -create "${ARQS[@]}" -output "$SAIDA"
chmod +x "$SAIDA"

echo "OK: $SAIDA"
lipo -info "$SAIDA"
