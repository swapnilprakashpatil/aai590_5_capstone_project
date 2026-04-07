# NutriVision AI - Full Stack Launcher (Windows / PowerShell)
# Starts the FastAPI backend and the Vite frontend concurrently.
# Usage: .\start.ps1
# Stop both: press Ctrl+C once (both jobs are cleaned up automatically).

$ROOT = $PSScriptRoot

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   NutriVision AI - Full Stack Launcher"  -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Locate Python venv
$PYTHON = Join-Path $ROOT ".venv\Scripts\python.exe"
if (-Not (Test-Path $PYTHON)) {
    # Fall back to system python
    $PYTHON = (Get-Command python -ErrorAction SilentlyContinue).Source
    if (-Not $PYTHON) {
        Write-Host "[ERROR] Python not found. Create a venv at .venv or install Python." -ForegroundColor Red
        exit 1
    }
    Write-Host "[WARN] .venv not found — using system Python: $PYTHON" -ForegroundColor Yellow
}
else {
    Write-Host "[OK] Python  : $PYTHON" -ForegroundColor Green
}

# Check Node / npm
$NODE = (Get-Command node -ErrorAction SilentlyContinue).Source
$NPM = (Get-Command npm  -ErrorAction SilentlyContinue).Source
if (-Not $NODE -or -Not $NPM) {
    Write-Host "[ERROR] Node.js / npm not found. Install from https://nodejs.org/" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Node.js : $(node --version)" -ForegroundColor Green
Write-Host "[OK] npm     : $(npm --version)"  -ForegroundColor Green

# Install frontend dependencies if needed
$FRONTEND = Join-Path $ROOT "frontend"
if (-Not (Test-Path (Join-Path $FRONTEND "node_modules"))) {
    Write-Host ""
    Write-Host "[Setup] Installing frontend dependencies..." -ForegroundColor Yellow
    Push-Location $FRONTEND
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] npm install failed." -ForegroundColor Red
        exit 1
    }
    Pop-Location
    Write-Host "[OK] Frontend dependencies installed." -ForegroundColor Green
}

Write-Host ""
Write-Host "------------------------------------------" -ForegroundColor DarkGray
Write-Host "  Backend  → http://localhost:8000"        -ForegroundColor White
Write-Host "  Frontend → http://localhost:3000"        -ForegroundColor White
Write-Host "  API Docs → http://localhost:8000/docs"   -ForegroundColor White
Write-Host "------------------------------------------" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Starting both servers... Press Ctrl+C to stop." -ForegroundColor Yellow
Write-Host ""

# Launch backend as a background job
$backendJob = Start-Job -Name "NutriVision-Backend" -ScriptBlock {
    param($root, $python)
    Set-Location (Join-Path $root "backend")
    & $python main.py
} -ArgumentList $ROOT, $PYTHON

# Launch frontend as a background job
$frontendJob = Start-Job -Name "NutriVision-Frontend" -ScriptBlock {
    param($frontend)
    Set-Location $frontend
    npm run dev
} -ArgumentList $FRONTEND

Write-Host "[STARTED] Backend  job id: $($backendJob.Id)"  -ForegroundColor Green
Write-Host "[STARTED] Frontend job id: $($frontendJob.Id)" -ForegroundColor Green
Write-Host ""

# Stream output from both jobs until Ctrl+C
try {
    while ($true) {
        Receive-Job -Job $backendJob  -ErrorAction SilentlyContinue |
        ForEach-Object { Write-Host "[backend]  $_" -ForegroundColor DarkCyan }

        Receive-Job -Job $frontendJob -ErrorAction SilentlyContinue |
        ForEach-Object { Write-Host "[frontend] $_" -ForegroundColor DarkGreen }

        # Exit if either job has stopped unexpectedly
        if ($backendJob.State -eq 'Failed') { Write-Host "[ERROR] Backend stopped."  -ForegroundColor Red; break }
        if ($frontendJob.State -eq 'Failed') { Write-Host "[ERROR] Frontend stopped." -ForegroundColor Red; break }

        Start-Sleep -Milliseconds 500
    }
}
finally {
    Write-Host ""
    Write-Host "Stopping servers..." -ForegroundColor Yellow
    Stop-Job  -Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $backendJob, $frontendJob -Force -ErrorAction SilentlyContinue
    Write-Host "Done." -ForegroundColor Green
}
