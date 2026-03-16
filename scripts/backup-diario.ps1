param(
  [string]$DestinoBase = 'E:\sistema',
  [string]$ProjetoDir = 'C:\Users\erivam\Documents\Playground\sistema-gestao-publica',
  [string]$PgBinDir = 'C:\Program Files\PostgreSQL\17\bin',
  [string]$DbHost = 'localhost',
  [int]$DbPort = 5432,
  [string]$DbName = 'sistema_gestao_publica',
  [string]$DbUser = 'postgres',
  [string]$DbPassword = 'postgres'
)

$ErrorActionPreference = 'Stop'

$dataPasta = Get-Date -Format 'yyyy.MM.dd'
$destinoDia = Join-Path $DestinoBase $dataPasta
$destinoCodigo = Join-Path $destinoDia 'codigo-fonte'
$arquivoBanco = Join-Path $destinoDia ("banco-{0}-{1}.backup" -f $DbName, $dataPasta)
$arquivoInfo = Join-Path $destinoDia 'info-backup.txt'
$pgDump = Join-Path $PgBinDir 'pg_dump.exe'

if (-not (Test-Path $ProjetoDir)) {
  throw "Projeto nao encontrado em: $ProjetoDir"
}

if (-not (Test-Path $pgDump)) {
  throw "pg_dump.exe nao encontrado em: $pgDump"
}

New-Item -ItemType Directory -Force -Path $destinoDia | Out-Null
New-Item -ItemType Directory -Force -Path $destinoCodigo | Out-Null

$null = robocopy $ProjetoDir $destinoCodigo /MIR /R:1 /W:1 /XD node_modules .next .git /XF dev-server.log *.backup
if ($LASTEXITCODE -ge 8) {
  throw "Falha ao copiar o codigo-fonte. Codigo do robocopy: $LASTEXITCODE"
}

$env:PGPASSWORD = $DbPassword
try {
  & $pgDump -U $DbUser -h $DbHost -p $DbPort -d $DbName -F c -f $arquivoBanco
}
finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

if (-not (Test-Path $arquivoBanco)) {
  throw 'Backup do banco nao foi gerado.'
}

@(
  "Data do backup: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
  "Projeto: $ProjetoDir"
  "Destino: $destinoDia"
  "Banco: $DbName"
  "Arquivo banco: $arquivoBanco"
) | Set-Content -Path $arquivoInfo -Encoding utf8

Write-Host "Backup concluido em: $destinoDia"
Write-Host "Codigo-fonte: $destinoCodigo"
Write-Host "Banco de dados: $arquivoBanco"
