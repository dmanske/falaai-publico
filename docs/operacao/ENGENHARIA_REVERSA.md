# Engenharia reversa do Typeless (REA + Ghidra)

Como conferir o Typeless instalado para ver o que o FalaAi ainda não faz. Usado em 18/10/2026 na conferência do
Typeless 2.8.2 (resultado em [../planos/CONFERENCIA_TYPELESS_2026-10-18.md](../planos/CONFERENCIA_TYPELESS_2026-10-18.md));
a primeira análise, só do JavaScript, está em [../design/DESIGN_FALAAI.md](../design/DESIGN_FALAAI.md).
Serve como referência de funcionalidades; **nenhum código, ícone, som ou servidor do Typeless é reutilizado**.

## Ferramentas

- **REA** (`/opt/homebrew/bin/rea`): faz a análise e devolve a evidência. Sempre o CLI: o servidor MCP do REA não tem
  as variáveis do Ghidra e o Hopper esbarra no bloqueio de Apple Events dentro do editor.
- **Ghidra 12.1.4** (Homebrew) com Java 21 (`openjdk@21`). O REA só o encontra com
  `GHIDRA_INSTALL_DIR=/opt/homebrew/opt/ghidra/libexec` e
  `JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home`; o script
  `scripts/engenharia-reversa/rea-ghidra.sh` já põe as duas e o `--provider ghidra`. Conferir com `rea doctor`.
- `recover-javascript-sources` do REA pede o Wakaru (não instalado). Não faz falta: o JavaScript do Typeless é
  ofuscado (obfuscator.io), mas o pacote da pílula deixa propriedades e números em claro.

## Bibliotecas nativas (Swift)

Ficam em `/Applications/Typeless.app/Contents/Resources/lib/` (`keyboard-helper`, `context-helper`, `input-helper`,
`util-helper`, `child-process-helper`). São universais: extraia a fatia arm64 antes, numa pasta de trabalho
(não no repositório), e rode **uma chamada do REA por vez** por análise (~35 s cada; no máximo 4 em paralelo
numa máquina de 16 GB).

```bash
lipo -thin arm64 /Applications/Typeless.app/Contents/Resources/lib/input-helper/build/libInputHelper.dylib -output libInputHelper.dylib
R=scripts/engenharia-reversa
$R/rea-ghidra.sh search libInputHelper.dylib '.' --mode regex --kind procedures --format json > procs.json
python3 -I $R/procs.py procs.json                       # endereço + nome das funções do módulo
$R/rea-ghidra.sh search libInputHelper.dylib '.' --mode regex --kind strings --format json > strings.json
$R/rea-ghidra.sh decompile libInputHelper.dylib 0x6914 --format json > dec-0x6914.json
python3 -I $R/dec.py dec-0x6914.json                    # só o pseudocódigo
```

Quando o pseudocódigo esconde uma constante (número pequeno ou texto curto do Swift), confira no desmontado:
`otool -tV libInputHelper.dylib | grep -A20 '<endereço>'`.

Regras: análise **só estática**. Nunca executar nem carregar o Typeless ou as bibliotecas dele (nada de
`observe-native-calls`, `capture-*`, `dlopen`), nem mexer no som, na área de transferência ou no teclado durante a
análise.

## JavaScript (pacote do app)

```bash
mkdir typeless-asar && node node_modules/@electron/asar/bin/asar.js extract /Applications/Typeless.app/Contents/Resources/app.asar typeless-asar
python3 -I scripts/engenharia-reversa/i18n.py typeless-asar/dist/renderer/static/js/<pacote do inglês>.js en.tsv
```

- **Textos da interface:** cada idioma é um pacote `.js`; o do inglês é o que tem `hands_free_click_finish__prefix`
  = "Next time, try pressing". O `i18n.py` tira os pares chave → texto (1.030 na 2.8.2): é a lista mais rápida das
  funções que existem.
- **Lógica da pílula:** `dist/renderer/static/js/<pacote do floating-bar.html>` (na 2.8.2, `DFvLNtQv.mjs`). Procure
  pelas propriedades em claro (`need_merge`, `taking_longer_alert_delay_ms`, `app_blacklist`, `MAX_DURATION_MS`…).
- O processo principal (`dist/main/index.js`) tem a tabela de textos embaralhada; dá para achar nomes de funções
  nativas (`libSetFocusedWindowEnhancedUserInterface`…), mas não a lógica.

## Comparar com o FalaAi

Para cada comportamento: endereço ou trecho do Typeless, o que o FalaAi faz (arquivo:linha), a diferença, o impacto
e a sugestão. O que vier disso vira um documento em `docs/planos/`.
