# improved-spoon PowerShell installer
#
# Usage (from PowerShell):
#   irm https://raw.githubusercontent.com/charlieethompsonn-cell/improved-spoon/main/install.ps1 | iex
#
# Installs improved-spoon into %USERPROFILE%\improved-spoon (override with
# $env:SPOON_HOME), clones or updates the repo, runs `npm install`, and copies
# .env.example to .env if it is not already present.

[CmdletBinding()]
param(
    [string]$Repo    = 'https://github.com/charlieethompsonn-cell/improved-spoon.git',
    [string]$Branch  = 'main',
    [string]$InstallDir = $(if ($env:SPOON_HOME) { $env:SPOON_HOME } else { Join-Path $env:USERPROFILE 'improved-spoon' })
)

$ErrorActionPreference = 'Stop'

function Write-Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Warn($msg) { Write-Host "!!  $msg" -ForegroundColor Yellow }

function Require-Command($name, $hint) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        throw "'$name' is required but was not found on PATH. $hint"
    }
}

Require-Command 'git'  'Install Git from https://git-scm.com/download/win'
Require-Command 'node' 'Install Node.js 18+ from https://nodejs.org/'
Require-Command 'npm'  'npm ships with Node.js; reinstall Node if this is missing.'

$nodeVersion = (& node --version).TrimStart('v')
$nodeMajor   = [int]($nodeVersion.Split('.')[0])
if ($nodeMajor -lt 18) {
    throw "Node.js 18+ is required (found v$nodeVersion)."
}

Write-Step "Installing improved-spoon into $InstallDir"

if (Test-Path (Join-Path $InstallDir '.git')) {
    Write-Step "Existing checkout detected - fetching latest $Branch"
    git -C $InstallDir fetch origin $Branch
    git -C $InstallDir checkout $Branch
    git -C $InstallDir pull --ff-only origin $Branch
} else {
    if (Test-Path $InstallDir) {
        throw "$InstallDir exists and is not a git checkout. Move or remove it, or set `$env:SPOON_HOME to a different path."
    }
    Write-Step "Cloning $Repo"
    git clone --branch $Branch $Repo $InstallDir
}

Push-Location $InstallDir
try {
    Write-Step 'Installing npm dependencies'
    npm install

    $envFile    = Join-Path $InstallDir '.env'
    $envExample = Join-Path $InstallDir '.env.example'
    if (-not (Test-Path $envFile) -and (Test-Path $envExample)) {
        Copy-Item $envExample $envFile
        Write-Warn "Created .env from .env.example - edit it to set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
    }
}
finally {
    Pop-Location
}

Write-Host ''
Write-Step 'Done.'
Write-Host "Next steps:" -ForegroundColor Green
Write-Host "  cd `"$InstallDir`""
Write-Host "  notepad .env             # fill in your Google OAuth credentials"
Write-Host "  npm run list             # show configured accounts"
Write-Host "  npm run auth -- personal # authorize an account"
