$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root 'fintechbackend'
$frontend = Join-Path $root 'finitch-frontend'
$python = Join-Path $backend 'venv\Scripts\python.exe'

if (-not (Test-Path $python)) {
    throw "Backend environment is missing. Run: python -m venv `"$backend\venv`""
}

Write-Host 'Starting Vaultic backend on http://127.0.0.1:8001...'
Start-Process powershell -ArgumentList @(
    '-NoExit',
    '-Command',
    "Set-Location '$backend'; & '$python' -m uvicorn main:app --host 127.0.0.1 --port 8001"
)

Write-Host 'Starting Vaultic frontend on http://localhost:3000...'
Start-Process powershell -ArgumentList @(
    '-NoExit',
    '-Command',
    "Set-Location '$frontend'; npm run dev"
)

Write-Host 'Vaultic is starting. Open http://localhost:3000/login after the backend reports startup complete.'
