param([string]$PostgresBin = 'C:/Program Files/PostgreSQL/18/bin')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$previousPassword = $env:PGPASSWORD
try {
    $env:PGPASSWORD = Get-Content -LiteralPath (Join-Path $projectRoot '.local/postgres-password') -Raw
    & (Join-Path $PostgresBin 'psql.exe') -w -h 127.0.0.1 -p 55432 -U stoic_dev -d kenyan_stoic_dev -v ON_ERROR_STOP=1 --single-transaction -f (Join-Path $projectRoot 'backend/fixtures/development.sql')
    if ($LASTEXITCODE -ne 0) { throw 'Development seed failed. Start the API once to apply migrations first.' }
} finally { $env:PGPASSWORD = $previousPassword }
