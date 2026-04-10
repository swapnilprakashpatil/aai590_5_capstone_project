<#
.SYNOPSIS
    Deploy NutriVision API to Azure App Service (Linux/Python) using OneDeploy.

.DESCRIPTION
    Packages the backend API (backend/, src/) with ML models, creates Azure
    resources, and deploys via OneDeploy with Oryx build (pip install).

.NOTES
    Prerequisites:
      - Azure CLI installed and logged in (az login)
      - PowerShell 7+
#>

[CmdletBinding()]
param(
    [string]$AppName         = "nutrivision-api-sp2026",
    [string]$ResourceGroup   = "rg-nutrivision-ai",
    [string]$Location        = "eastus",
    [string]$PlanName        = "asp-nutrivision-ai",
    [string]$Sku             = "B3",
    [string]$PythonVersion   = "3.11",
    [string]$StartupCommand  = "python3 -m gunicorn backend.main:app -c gunicorn.conf.py"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# --- Paths ----------------------------------------------------------------
$ProjectRoot = $PSScriptRoot
$DeployDir   = Join-Path $ProjectRoot "deploy"
$StagingDir  = Join-Path $ProjectRoot ".deploy_staging"
$ZipFile     = Join-Path $ProjectRoot "deploy.zip"
$EnvFile     = Join-Path $ProjectRoot "backend" ".env"

# ---------------------------------------------------------------------------
function Assert-Success {
    param([string]$Message)
    if ($LASTEXITCODE -ne 0) {
        Write-Error "FAILED: $Message (exit code $LASTEXITCODE)"
        exit 1
    }
}

# ---------------------------------------------------------------------------
# 1. Validate source files
# ---------------------------------------------------------------------------
Write-Host "`n=== Validating source files ===" -ForegroundColor Cyan
$checks = @(
    (Join-Path $ProjectRoot "backend" "main.py"),
    (Join-Path $ProjectRoot "backend" "agents" "__init__.py"),
    (Join-Path $ProjectRoot "backend" "models" "xgb_tuned.json"),
    (Join-Path $ProjectRoot "src"     "__init__.py"),
    (Join-Path $ProjectRoot "src"     "anomaly" "inference.py"),
    (Join-Path $DeployDir   "gunicorn.conf.py"),
    (Join-Path $DeployDir   "requirements.txt"),
    (Join-Path $DeployDir   "startup.sh")
)
foreach ($f in $checks) {
    if (-not (Test-Path $f)) {
        Write-Error "Missing required file: $f"
        exit 1
    }
}
Write-Host "  All required files present." -ForegroundColor Green

# ---------------------------------------------------------------------------
# 2. Build deployment package (staging -> zip)
# ---------------------------------------------------------------------------
Write-Host "`n=== Building deployment package ===" -ForegroundColor Cyan
if (Test-Path $StagingDir) { Remove-Item $StagingDir -Recurse -Force }
if (Test-Path $ZipFile)    { Remove-Item $ZipFile -Force }

# backend/  (main.py + agents + models, exclude __pycache__ and .env)
$backendSrc  = Join-Path $ProjectRoot "backend"
$backendDest = Join-Path $StagingDir  "backend"
New-Item $backendDest -ItemType Directory -Force | Out-Null
Copy-Item (Join-Path $backendSrc "main.py") $backendDest

$agentsDest = Join-Path $backendDest "agents"
New-Item $agentsDest -ItemType Directory -Force | Out-Null
Copy-Item (Join-Path $backendSrc "agents" "*.py") $agentsDest

$modelsDest = Join-Path $backendDest "models"
New-Item $modelsDest -ItemType Directory -Force | Out-Null
Copy-Item (Join-Path $backendSrc "models" "*") $modelsDest -Exclude "*.pyc"

# src/  (anomaly package for inference)
$srcDest = Join-Path $StagingDir "src"
New-Item $srcDest -ItemType Directory -Force | Out-Null
Copy-Item (Join-Path $ProjectRoot "src" "__init__.py") $srcDest

$anomalyDest = Join-Path $srcDest "anomaly"
New-Item $anomalyDest -ItemType Directory -Force | Out-Null
Copy-Item (Join-Path $ProjectRoot "src" "anomaly" "*.py") $anomalyDest

# Root-level deployment config
Copy-Item (Join-Path $DeployDir "gunicorn.conf.py")  $StagingDir
Copy-Item (Join-Path $DeployDir "requirements.txt")  $StagingDir

# Create zip
Compress-Archive -Path (Join-Path $StagingDir "*") -DestinationPath $ZipFile -Force
$zipSizeMB = [math]::Round((Get-Item $ZipFile).Length / 1MB, 1)
Write-Host "  Package created: $ZipFile ($zipSizeMB MB)" -ForegroundColor Green

# Cleanup staging
Remove-Item $StagingDir -Recurse -Force

# ---------------------------------------------------------------------------
# 3. Create Resource Group
# ---------------------------------------------------------------------------
Write-Host "`n=== Creating Resource Group: $ResourceGroup ===" -ForegroundColor Cyan
az group create --name $ResourceGroup --location $Location --output none
Assert-Success "Create resource group"
Write-Host "  Resource group ready." -ForegroundColor Green

# ---------------------------------------------------------------------------
# 4. Create App Service Plan (Linux)
# ---------------------------------------------------------------------------
Write-Host "`n=== Creating App Service Plan: $PlanName (SKU: $Sku) ===" -ForegroundColor Cyan
az appservice plan create `
    --name $PlanName `
    --resource-group $ResourceGroup `
    --sku $Sku `
    --is-linux `
    --output none
Assert-Success "Create App Service plan"
Write-Host "  App Service plan ready." -ForegroundColor Green

# ---------------------------------------------------------------------------
# 5. Create Web App
# ---------------------------------------------------------------------------
Write-Host "`n=== Creating Web App: $AppName ===" -ForegroundColor Cyan
az webapp create `
    --name $AppName `
    --resource-group $ResourceGroup `
    --plan $PlanName `
    --runtime "PYTHON:$PythonVersion" `
    --output none
Assert-Success "Create web app"
Write-Host "  Web app created." -ForegroundColor Green

# ---------------------------------------------------------------------------
# 6. Configure app settings (Oryx build + secrets from .env)
# ---------------------------------------------------------------------------
Write-Host "`n=== Configuring app settings ===" -ForegroundColor Cyan

# Enable Oryx build so pip install runs during deployment
$settings = @("SCM_DO_BUILD_DURING_DEPLOYMENT=true", "SCM_COMMAND_IDLE_TIMEOUT=1800")

# Load secrets from backend/.env (if it exists)
if (Test-Path $EnvFile) {
    Write-Host "  Loading environment variables from backend/.env" -ForegroundColor Yellow
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            $eqIdx = $line.IndexOf("=")
            if ($eqIdx -gt 0) {
                $key = $line.Substring(0, $eqIdx).Trim()
                $val = $line.Substring($eqIdx + 1).Trim().Trim("'", '"')
                $settings += "$key=$val"
                Write-Host "    $key = ****" -ForegroundColor DarkGray
            }
        }
    }
} else {
    Write-Warning "backend/.env not found — Azure OpenAI keys must be set manually."
}

az webapp config appsettings set `
    --name $AppName `
    --resource-group $ResourceGroup `
    --settings @settings `
    --output none
Assert-Success "Set app settings"
Write-Host "  App settings configured." -ForegroundColor Green

# ---------------------------------------------------------------------------
# 7. Configure startup command
# ---------------------------------------------------------------------------
Write-Host "`n=== Configuring startup command ===" -ForegroundColor Cyan
az webapp config set `
    --name $AppName `
    --resource-group $ResourceGroup `
    --startup-file $StartupCommand `
    --output none
Assert-Success "Set startup command"
Write-Host "  Startup command: $StartupCommand" -ForegroundColor Green

# ---------------------------------------------------------------------------
# 8. Deploy using OneDeploy (async — Oryx build can take minutes)
# ---------------------------------------------------------------------------
Write-Host "`n=== Deploying via OneDeploy ($zipSizeMB MB) ===" -ForegroundColor Cyan
az webapp deploy `
    --name $AppName `
    --resource-group $ResourceGroup `
    --src-path $ZipFile `
    --type zip `
    --async true
Assert-Success "OneDeploy (upload)"
Write-Host "  Zip uploaded. Waiting for Oryx build..." -ForegroundColor Yellow

# Poll Kudu deployment API until build finishes
$kuduUrl = "https://${AppName}.scm.azurewebsites.net/api/deployments/latest"
$buildTimeout = 900
$elapsed = 0
$buildOk = $false
while ($elapsed -lt $buildTimeout) {
    Start-Sleep -Seconds 20
    $elapsed += 20
    try {
        $dep = Invoke-RestMethod -Uri $kuduUrl -TimeoutSec 30
        $pct = if ($dep.progress) { $dep.progress } else { "waiting" }
        Write-Host "  [$([math]::Floor($elapsed/60))m $($elapsed%60)s] status=$($dep.status) complete=$($dep.complete) - $pct" -ForegroundColor DarkGray
        if ($dep.complete -eq $true) {
            if ($dep.status -eq 4) {
                Write-Error "Oryx build FAILED: $($dep.status_text)"
                exit 1
            }
            Write-Host "  Build completed successfully." -ForegroundColor Green
            $buildOk = $true
            break
        }
    } catch {
        Write-Host "  [$([math]::Floor($elapsed/60))m $($elapsed%60)s] Kudu not ready yet..." -ForegroundColor DarkGray
    }
}
if (-not $buildOk) {
    Write-Error "Build did not complete within $buildTimeout seconds."
    exit 1
}

# ---------------------------------------------------------------------------
# 9. Verify health endpoint
# ---------------------------------------------------------------------------
$AppUrl = "https://${AppName}.azurewebsites.net"
Write-Host "`n=== Verifying deployment ===" -ForegroundColor Cyan
Write-Host "  App URL: $AppUrl"
Write-Host "  Waiting 90 seconds for app to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 90

$maxRetries = 10
$success = $false
for ($i = 1; $i -le $maxRetries; $i++) {
    try {
        $response = Invoke-RestMethod -Uri "$AppUrl/health" -Method Get -TimeoutSec 30
        Write-Host "  Health check response:" -ForegroundColor Green
        Write-Host "    Status : $($response.status)" -ForegroundColor Green
        $success = $true
        break
    } catch {
        if ($i -lt $maxRetries) {
            Write-Host "  Attempt $i/$maxRetries failed. Retrying in 30 seconds..." -ForegroundColor Yellow
            Start-Sleep -Seconds 30
        }
    }
}
if (-not $success) {
    Write-Warning "Health check failed after $maxRetries attempts."
    Write-Warning "  Check manually : curl $AppUrl/health"
    Write-Warning "  Stream logs    : az webapp log tail --name $AppName --resource-group $ResourceGroup"
}

# ---------------------------------------------------------------------------
# 10. Cleanup temp zip
# ---------------------------------------------------------------------------
if (Test-Path $ZipFile) { Remove-Item $ZipFile -Force }

# ---------------------------------------------------------------------------
Write-Host "`n=== Deployment complete ===" -ForegroundColor Green
Write-Host "  App URL  : $AppUrl"
Write-Host "  Resource Group : $ResourceGroup"
Write-Host "  Plan     : $PlanName ($Sku)"
Write-Host "  Logs     : az webapp log tail --name $AppName --resource-group $ResourceGroup"
Write-Host ""
