# Lançar uma versão: empacotar, instalar no Mac e publicar

Roteiro usado na 1.1.0 (18/10/2026) e na 1.1.1 (20/10/2026). Antes de começar, a versão e a página Novidades já
precisam estar no commit ([../modulos/novidades.md](../modulos/novidades.md), "Ao lançar uma versão").
Publicar só com o ok do Daniel.

## 1. Empacotar

```bash
rm -rf release && npm run empacotar:mac
```

Gera `release/mac-arm64/FalaAi.app` (chip Apple), `release/mac/FalaAi.app` (Intel) e os `.dmg`. A assinatura é a do
certificado local "FalaAi Local" ([ASSINATURA_MAC.md](ASSINATURA_MAC.md)); a mensagem `assinado com "FalaAi Local"`
aparece no fim. Conferir os dois apps:

```bash
defaults read "$PWD/release/mac-arm64/FalaAi.app/Contents/Info.plist" CFBundleShortVersionString   # versão nova
codesign -dr - release/mac-arm64/FalaAi.app      # certificate leaf = H"5f763d8b…" (mantém a Acessibilidade)
lipo -archs release/mac-arm64/FalaAi.app/Contents/MacOS/FalaAi   # arm64 (e x86_64 em release/mac)
```

## 2. Instalar no Mac do Daniel (chip Apple)

```bash
osascript -e 'quit app "FalaAi"'                        # o FalaAi fecha; esperar o processo sumir
mv /Applications/FalaAi.app <pasta de backup>/FalaAi-<versão antiga>.app
ditto release/mac-arm64/FalaAi.app /Applications/FalaAi.app
env -u ELECTRON_RUN_AS_NODE open /Applications/FalaAi.app
```

- **`env -u ELECTRON_RUN_AS_NODE` é obrigatório** quando o comando roda no terminal do Kiro (ou do VS Code): esses
  terminais trazem `ELECTRON_RUN_AS_NODE=1`, o `open` repassa a variável e o FalaAi roda como Node puro e fecha na
  hora, sem mensagem (aconteceu na 1.1.1). É o mesmo motivo de os scripts `npm` usarem `env -u`.
- Conferir que ficaram rodando o `FalaAi` e o `falaai-auxiliar-mac` (`ps -axo pid,command | grep -i falaai`).

## 3. Git (privado e público no mesmo dia)

O repositório público `dmanske/falaai-publico` é espelho: tem **os mesmos commits** do privado.

```bash
git push origin main && git push origin vX.Y.Z
git push https://github.com/dmanske/falaai-publico.git main
git push https://github.com/dmanske/falaai-publico.git vX.Y.Z
```

A tag dispara o workflow `Build` (`.github/workflows/build.yml`), que monta o instalador do Windows (~3 min).

## 4. Release no repositório público

É nela que o app procura atualizações (`REPO_ATUALIZACOES` em `src/shared/config.ts`).

```bash
mkdir -p release/publicar
ditto -c -k --sequesterRsrc --keepParent release/mac-arm64/FalaAi.app release/publicar/FalaAi-X.Y.Z-mac-chip-apple.zip
ditto -c -k --sequesterRsrc --keepParent release/mac/FalaAi.app release/publicar/FalaAi-X.Y.Z-mac-intel.zip
gh run list --repo dmanske/falaai-publico --limit 1                  # id da execução da tag
gh run watch <id> --repo dmanske/falaai-publico --exit-status
gh run download <id> --repo dmanske/falaai-publico --name FalaAi-Windows --dir release/win
gh release view vANTERIOR --repo dmanske/falaai-publico --json body -q .body   # modelo das notas
gh release create vX.Y.Z --repo dmanske/falaai-publico --verify-tag --title "FalaAi X.Y.Z" \
  --notes-file release/publicar/notas-X.Y.Z.md release/publicar/*.zip release/win/FalaAi-Setup-X.Y.Z.exe
```

- Antes de publicar, descompactar os zips numa pasta temporária e conferir `codesign --verify --deep --strict`, a
  versão e a arquitetura.
- Notas: mesmo formato da Release anterior (o que mudou, Baixar, Primeira abertura, Você vai precisar, O que tem,
  Avisos). Os nomes dos arquivos na seção Baixar mudam com a versão.
- `release/` está no `.gitignore`: nada disso vai para o git.
