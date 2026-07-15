[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Root = $PSScriptRoot
$Changed = 'no'

function Stop-Install {
    param(
        [Parameter(Mandatory = $true)][string]$WhatHappened,
        [string]$WhatChanged = 'nothing',
        [string]$NextAction = "Fix the item above, then run '.\install.ps1' again from this folder."
    )
    Write-Host 'Claude Kickstart could not be initialized.'
    Write-Host "What happened: $WhatHappened"
    Write-Host "What changed: $WhatChanged"
    Write-Host "Safest next action: $NextAction"
    exit 1
}

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
    Stop-Install -WhatHappened 'Claude Code is not available in your command path.' `
        -NextAction "Install or repair Claude Code, confirm 'claude --version' works, then run this installer again."
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Stop-Install -WhatHappened 'Node.js is required by this version-zero state engine but was not found.' `
        -NextAction 'Install Node.js 18 or newer, then run this installer again.'
}

$NodeMajor = [int](& node -p 'Number(process.versions.node.split(".")[0])')
if ($NodeMajor -lt 18) {
    Stop-Install -WhatHappened "Node.js 18 or newer is required; this computer has $(& node --version)." `
        -NextAction 'Update Node.js, then run this installer again.'
}

$Required = @(
    '.claude\commands\kickstart.md',
    '.claude\commands\leave-kickstart.md',
    '.claude\settings.json',
    'claude-kickstart\RUNTIME.md',
    'claude-kickstart\SAFETY.md',
    'claude-kickstart\bin\kickstart-state.mjs'
)

foreach ($Relative in $Required) {
    $Candidate = Join-Path $Root $Relative
    if (-not (Test-Path -LiteralPath $Candidate -PathType Leaf)) {
        Stop-Install -WhatHappened "A required repository file is missing: $Relative" `
            -WhatChanged $Changed `
            -NextAction 'Download a fresh copy of the repository; do not create a guessed replacement file.'
    }
}

$SettingsPath = Join-Path $Root '.claude\settings.json'
try {
    $null = Get-Content -LiteralPath $SettingsPath -Raw -Encoding UTF8 | ConvertFrom-Json
} catch {
    Stop-Install -WhatHappened '.claude\settings.json is not valid JSON.' `
        -WhatChanged $Changed `
        -NextAction 'Restore the repository copy of .claude\settings.json, then retry.'
}

Push-Location $Root
try {
    $InitOutput = & node 'claude-kickstart\bin\kickstart-state.mjs' init 2>&1
    if ($LASTEXITCODE -ne 0) {
        Stop-Install -WhatHappened ($InitOutput -join [Environment]::NewLine) -WhatChanged $Changed
    }
    if (($InitOutput -join [Environment]::NewLine) -match '"changed": true') {
        $Changed = 'only missing project-local state files were created'
    }

    $DoctorOutput = & node 'claude-kickstart\bin\kickstart-state.mjs' doctor 2>&1
    if ($LASTEXITCODE -ne 0) {
        Stop-Install -WhatHappened ($DoctorOutput -join [Environment]::NewLine) -WhatChanged $Changed
    }
} finally {
    Pop-Location
}

Write-Host 'Claude Kickstart is ready in this folder.'
Write-Host "What changed: $Changed."
Write-Host 'Nothing was written to global Claude Code settings or outside this repository.'
Write-Host 'In Claude Code, run: /kickstart'
