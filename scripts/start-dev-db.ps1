param(
    [string]$PostgresBin = 'C:/Program Files/PostgreSQL/18/bin',
    [int]$Port = 55432
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$localRoot = Join-Path $projectRoot '.local'
$dataPath = Join-Path $localRoot 'postgres'
$passwordPath = Join-Path $localRoot 'postgres-password'
$envPath = Join-Path $projectRoot 'backend/.env'
foreach ($binary in @('initdb.exe','postgres.exe','pg_isready.exe','psql.exe','createdb.exe')) {
    if (-not (Test-Path -LiteralPath (Join-Path $PostgresBin $binary))) { throw "Missing PostgreSQL executable: $binary. Supply -PostgresBin." }
}

New-Item -ItemType Directory -Path $localRoot -Force | Out-Null
if (-not (Test-Path -LiteralPath (Join-Path $dataPath 'PG_VERSION'))) {
    if (Test-Path -LiteralPath $envPath) { throw 'backend/.env already exists. Configure the database manually rather than overwrite it.' }
    $password = [Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(24))
    Set-Content -LiteralPath $passwordPath -Value $password -NoNewline
    & (Join-Path $PostgresBin 'initdb.exe') -D $dataPath -U stoic_dev --auth=scram-sha-256 --encoding=UTF8 --locale=C --pwfile=$passwordPath
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL initialization failed.' }
    @("DATABASE_URL=postgres://stoic_dev:${password}@127.0.0.1:$Port/kenyan_stoic_dev", 'BACKEND_ADDR=127.0.0.1:3000', 'RUST_LOG=info') | Set-Content -LiteralPath $envPath
}

if (-not (Test-Path -LiteralPath $passwordPath)) { throw 'Local database password file is missing.' }
$pidPath = Join-Path $dataPath 'postmaster.pid'
$running = $false
if (Test-Path -LiteralPath $pidPath) {
    $serverPid = [int](Get-Content -LiteralPath $pidPath -TotalCount 1)
    $running = $null -ne (Get-Process -Id $serverPid -ErrorAction SilentlyContinue)
}
if (-not $running) {
    # Launch directly: pg_ctl's restricted-token launcher can fail in sandboxed Windows sessions.
    $serverProcess = Start-Process -FilePath (Join-Path $PostgresBin 'postgres.exe') -ArgumentList @('-D', ('"' + $dataPath + '"'), '-h', '127.0.0.1', '-p', "$Port") -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $localRoot 'postgres.stdout.log') -RedirectStandardError (Join-Path $localRoot 'postgres.stderr.log')
    $ready = $false
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        & (Join-Path $PostgresBin 'pg_isready.exe') -h 127.0.0.1 -p $Port -t 1 | Out-Null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
        if ($serverProcess.HasExited) { break }
        Start-Sleep -Milliseconds 250
    }
    if (-not $ready) { throw 'PostgreSQL startup failed. Check .local/postgres.stderr.log and port availability.' }
}

$previousPassword = $env:PGPASSWORD
try {
    $env:PGPASSWORD = Get-Content -LiteralPath $passwordPath -Raw
    $exists = & (Join-Path $PostgresBin 'psql.exe') -w -h 127.0.0.1 -p $Port -U stoic_dev -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = 'kenyan_stoic_dev'"
    if ($LASTEXITCODE -ne 0) { throw 'Database connection failed.' }
    if ($exists -ne '1') {
        & (Join-Path $PostgresBin 'createdb.exe') -w -h 127.0.0.1 -p $Port -U stoic_dev kenyan_stoic_dev
        if ($LASTEXITCODE -ne 0) { throw 'Database creation failed.' }
    }
} finally {
    $env:PGPASSWORD = $previousPassword
}
Write-Output "Isolated development database ready on 127.0.0.1:$Port. Credentials are in ignored local files."
