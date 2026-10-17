# Compila o auxiliar nativo do Windows (Rust) em release e copia para resources/bin.
# Uso (no Windows): npm run nativo:win
$ErrorActionPreference = "Stop"

$raiz = Split-Path -Parent $PSScriptRoot
$projeto = Join-Path $raiz "nativo/windows"
$destinoPasta = Join-Path $raiz "resources/bin"
$destino = Join-Path $destinoPasta "falaai-auxiliar-win.exe"

if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    Write-Error "cargo não encontrado. Instale o Rust (https://rustup.rs) e tente de novo."
}

Push-Location $projeto
try {
    cargo build --release --locked
    if ($LASTEXITCODE -ne 0) { throw "cargo build falhou (código $LASTEXITCODE)." }
} finally {
    Pop-Location
}

$compilado = Join-Path $projeto "target/release/falaai-auxiliar-win.exe"
if (-not (Test-Path $compilado)) { throw "Binário não encontrado: $compilado" }

New-Item -ItemType Directory -Force -Path $destinoPasta | Out-Null
Copy-Item -Force $compilado $destino
Write-Host "OK: $destino"
