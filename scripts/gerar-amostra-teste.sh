#!/usr/bin/env bash
# Gera resources/amostra-teste.wav: a frase de FRASE_AMOSTRA (src/shared/config.ts) falada pela
# voz Luciana do macOS, em WAV 16 kHz mono (mesmo formato que o ditado vai mandar para a IA).
# Só precisa rodar de novo se a frase mudar. Usa apenas ferramentas do macOS (say, afconvert).
set -euo pipefail
cd "$(dirname "$0")/.."
FRASE="Teste de ditado, um, dois, três."
TMP="$(mktemp -d)"
say -v Luciana -o "$TMP/amostra.aiff" "$FRASE"
afconvert -f WAVE -d LEI16@16000 -c 1 "$TMP/amostra.aiff" resources/amostra-teste.wav
rm -rf "$TMP"
echo "OK: resources/amostra-teste.wav ($(wc -c < resources/amostra-teste.wav) bytes)"
