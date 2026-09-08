# Antigravity Cache Reset Script
# Usage: Drag this file to terminal and press Enter, or run: .\reset-antigravity.ps1

$configPath = "$env:USERPROFILE\.config\opencode\antigravity-accounts.json"

if (-not (Test-Path $configPath)) {
    Write-Host "ERROR: antigravity-accounts.json not found at $configPath" -ForegroundColor Red
    exit 1
}

$json = Get-Content $configPath | ConvertFrom-Json
$now = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()

Write-Host "Resetting Antigravity cache..." -ForegroundColor Cyan

$json.accounts | ForEach-Object {
    $_.rateLimitResetTimes = @{}
    $_.cachedQuotaUpdatedAt = $now
    $_.cachedQuota.PSObject.Properties | ForEach-Object {
        $_.Value.remainingFraction = 1
        $_.Value.resetTime = $null
    }
}

$json.activeIndexByFamily = @{ claude = 0; gemini = 0 }

$json | ConvertTo-Json -Depth 10 | Set-Content $configPath -Encoding UTF8

Write-Host "SUCCESS: Antigravity cache reset at $now" -ForegroundColor Green
Write-Host ""
Write-Host "Accounts reset:" -ForegroundColor Cyan
$json.accounts | ForEach-Object { Write-Host "  - $($_.email)" -ForegroundColor White }