# NutriVision AI - Frontend Launcher
# PowerShell script to start the development server

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   NutriVision AI - Frontend Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "[Checking] Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Host "[OK] Node.js version: $nodeVersion" -ForegroundColor Green
    }
    else {
        throw "Node.js not found"
    }
}
catch {
    Write-Host "[ERROR] Node.js is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Node.js from: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if npm is installed
Write-Host "[Checking] npm installation..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version 2>$null
    if ($npmVersion) {
        Write-Host "[OK] npm version: $npmVersion" -ForegroundColor Green
    }
    else {
        throw "npm not found"
    }
}
catch {
    Write-Host "[ERROR] npm is not installed!" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Check if node_modules exists
if (-Not (Test-Path "node_modules")) {
    Write-Host "[1/2] Installing dependencies (this may take a few minutes)..." -ForegroundColor Yellow
    Write-Host ""
    
    npm install
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "[ERROR] Failed to install dependencies" -ForegroundColor Red
        Write-Host ""
        Read-Host "Press Enter to exit"
        exit 1
    }
    
    Write-Host ""
    Write-Host "[OK] Dependencies installed successfully!" -ForegroundColor Green
}
else {
    Write-Host "[1/2] Dependencies already installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "[2/2] Starting development server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Server will start at:" -ForegroundColor White
Write-Host "  http://localhost:3000" -ForegroundColor Green -NoNewline
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start the development server
npm run dev

# If the server stops, pause before exiting
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Server stopped with an error" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
}
