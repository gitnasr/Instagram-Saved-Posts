# =================================================================
# Instagram Saved Posts Tracker - 1-Command Windows Installer
# GitHub: https://github.com/gitnasr/Instagram-Saved-Posts
# =================================================================

$ErrorActionPreference = "Stop"

Write-Host @"
  ___           _          ____                  
 |_ _|_ __  ___| |_ __ _  / ___|  __ ___   _____ 
  | || '_ \/ __| __/ _` | \___ \ / _` \ \ / / _ \
  | || | | \__ \ || (_| |  ___) | (_| |\ V /  __/
 |___|_| |_|___/\__\__,_| |____/ \__,_| \_/ \___|
                                                 
  📸 Instagram Saved Posts Tracker - Self-Hosted
"@ -ForegroundColor Cyan

Write-Host "`n==> Starting 1-command Windows installation...`n" -ForegroundColor Cyan

# Check Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Docker Desktop is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Docker Desktop for Windows: https://docs.docker.com/desktop/setup/install/windows-install/"
    exit 1
}

# Determine install folder
$InstallDir = Join-Path $HOME "instagram-saved-posts"
if ($args.Count -gt 0) {
    $InstallDir = $args[0]
}

Write-Host "==> Installing into: $InstallDir" -ForegroundColor Cyan
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}
Set-Location $InstallDir

# Download docker-compose.yml
Write-Host "==> Downloading Docker Compose configuration..." -ForegroundColor Cyan
$ComposeUrl = "https://raw.githubusercontent.com/gitnasr/Instagram-Saved-Posts/master/docker-compose.yml"
Invoke-WebRequest -Uri $ComposeUrl -OutFile "docker-compose.yml" -UseBasicParsing

# Download .env.example
$EnvUrl = "https://raw.githubusercontent.com/gitnasr/Instagram-Saved-Posts/master/.env.example"
Invoke-WebRequest -Uri $EnvUrl -OutFile ".env.example" -UseBasicParsing

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
}

# Start containers
Write-Host "==> Pulling container images and starting services..." -ForegroundColor Cyan
docker compose pull
docker compose up -d

Write-Host "`n======================================================" -ForegroundColor Green
Write-Host " 🎉 InstaSave Tracker is successfully installed!" -ForegroundColor Green
Write-Host "======================================================`n" -ForegroundColor Green

Write-Host "Access your instance at:"
Write-Host "  👉 Local: http://localhost:3000" -ForegroundColor Cyan

Write-Host "`nNext steps:"
Write-Host "  1. Open http://localhost:3000 in your browser."
Write-Host "  2. Complete the quick onboarding wizard."
Write-Host "  3. Start archiving and exploring your saved posts!`n"

Write-Host "Management commands:"
Write-Host "  cd $InstallDir" -ForegroundColor Yellow
Write-Host "  docker compose logs -f    # View logs" -ForegroundColor Yellow
Write-Host "  docker compose restart    # Restart stack" -ForegroundColor Yellow
Write-Host "  docker compose down       # Stop stack`n" -ForegroundColor Yellow
