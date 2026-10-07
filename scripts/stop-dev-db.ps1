param([string]$PostgresBin = 'C:/Program Files/PostgreSQL/18/bin')
$ErrorActionPreference = 'Stop'
$dataPath = Join-Path (Split-Path -Parent $PSScriptRoot) '.local/postgres'
if (-not (Test-Path -LiteralPath (Join-Path $dataPath 'PG_VERSION'))) { throw 'No project development database exists.' }
& (Join-Path $PostgresBin 'pg_ctl.exe') stop -D $dataPath -m fast -w
if ($LASTEXITCODE -ne 0) { throw 'Could not stop the project development database.' }
