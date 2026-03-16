$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

$appUrl = "http://localhost:3000"
$stdoutLog = Join-Path $projectRoot "prod-server.log"
$stderrLog = Join-Path $projectRoot "prod-server.err.log"

function Test-AppOnline {
  try {
    $response = Invoke-WebRequest -Uri $appUrl -UseBasicParsing -TimeoutSec 5
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

function Open-AppInBrowser {
  try {
    Start-Process $appUrl | Out-Null
    Write-Host "Navegador aberto em $appUrl" -ForegroundColor Green
  } catch {
    Write-Host "Nao consegui abrir o navegador automaticamente." -ForegroundColor Yellow
    Write-Host "Abra manualmente: $appUrl" -ForegroundColor Yellow
  }
}

Write-Host ""
Write-Host "=== Sistema de Gestao Publica ===" -ForegroundColor Cyan
Write-Host "Pasta: $projectRoot"
Write-Host ""

if (Test-AppOnline) {
  Write-Host "O sistema ja esta rodando. Abrindo no navegador..." -ForegroundColor Yellow
  Open-AppInBrowser
  exit 0
}

if (-not (Test-Path (Join-Path $projectRoot "node_modules"))) {
  throw "Dependencias nao encontradas. Rode 'npm install' antes de abrir o sistema."
}

Write-Host "Aplicando migrations no banco..." -ForegroundColor Cyan
& npx.cmd prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
  throw "Nao foi possivel atualizar o banco. Verifique se o PostgreSQL esta ligado."
}

if (-not (Test-Path (Join-Path $projectRoot ".next\\BUILD_ID"))) {
  Write-Host "Build de producao nao encontrado. Gerando build..." -ForegroundColor Cyan
  & npm.cmd run build
  if ($LASTEXITCODE -ne 0) {
    throw "Falha ao gerar o build de producao."
  }
}

Write-Host "Subindo o servidor local na porta 3000..." -ForegroundColor Cyan
Start-Process `
  -FilePath "npm.cmd" `
  -ArgumentList @("run", "start", "--", "--hostname", "0.0.0.0", "--port", "3000") `
  -WorkingDirectory $projectRoot `
  -RedirectStandardOutput $stdoutLog `
  -RedirectStandardError $stderrLog | Out-Null

$started = $false
for ($attempt = 1; $attempt -le 15; $attempt++) {
  Start-Sleep -Seconds 1
  if (Test-AppOnline) {
    $started = $true
    break
  }
}

if (-not $started) {
  throw "O servidor nao respondeu em $appUrl. Veja os logs em prod-server.log e prod-server.err.log."
}

Write-Host "Sistema pronto. Abrindo no navegador..." -ForegroundColor Green
Open-AppInBrowser
