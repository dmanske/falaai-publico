#!/bin/zsh
# Roda o CLI do REA com o Ghidra. Uso: rea-ghidra.sh <comando do rea> <args...>
export GHIDRA_INSTALL_DIR=/opt/homebrew/opt/ghidra/libexec
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
exec /opt/homebrew/bin/rea "$@" --provider ghidra
