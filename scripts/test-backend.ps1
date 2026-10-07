param(
    [string]$PostgresBin = 'C:/Program Files/PostgreSQL/18/bin',
    [string]$Cargo = 'cargo',
    [switch]$Offline
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$passwordPath = Join-Path $projectRoot '.local/postgres-password'
if (-not (Test-Path -LiteralPath $passwordPath)) { throw 'Start the project development database first.' }
$previousPassword = $env:PGPASSWORD
$previousDatabaseUrl = $env:DATABASE_URL
try {
    $password = Get-Content -LiteralPath $passwordPath -Raw
    $env:PGPASSWORD = $password
    $exists = & (Join-Path $PostgresBin 'psql.exe') -w -h 127.0.0.1 -p 55432 -U stoic_dev -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = 'kenyan_stoic_test'"
    if ($LASTEXITCODE -ne 0) { throw 'Could not connect to the isolated PostgreSQL cluster.' }
    if ($exists -ne '1') {
        & (Join-Path $PostgresBin 'createdb.exe') -w -h 127.0.0.1 -p 55432 -U stoic_dev kenyan_stoic_test
        if ($LASTEXITCODE -ne 0) { throw 'Could not create the test database.' }
    }
    $env:DATABASE_URL = "postgres://stoic_dev:${password}@127.0.0.1:55432/kenyan_stoic_test"
    Push-Location (Join-Path $projectRoot 'backend')
    try {
        $cargoArguments = @('test', '--locked')
        if ($Offline) { $cargoArguments += '--offline' }
        & $Cargo @cargoArguments
        if ($LASTEXITCODE -ne 0) { throw 'Backend tests failed.' }
    } finally { Pop-Location }
} finally {
    $env:PGPASSWORD = $previousPassword
    $env:DATABASE_URL = $previousDatabaseUrl
}
