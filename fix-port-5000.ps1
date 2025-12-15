# Quick fix for "Port 5000 already in use" error
# This script kills all Node.js processes to free up the port

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fixing Port 5000 Conflict" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Finding Node.js processes..." -ForegroundColor Yellow
$nodeProcs = Get-Process node -ErrorAction SilentlyContinue

if ($nodeProcs) {
    Write-Host "Found $($nodeProcs.Count) Node.js process(es)" -ForegroundColor Yellow
    Write-Host ""
    
    $nodeProcs | ForEach-Object {
        Write-Host "  Killing PID $($_.Id)..." -ForegroundColor White
        try {
            Stop-Process -Id $_.Id -Force -ErrorAction Stop
            Write-Host "    ✅ Killed" -ForegroundColor Green
        } catch {
            Write-Host "    ❌ Failed: $_" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Start-Sleep -Seconds 2
    Write-Host "✅ All Node.js processes stopped!" -ForegroundColor Green
} else {
    Write-Host "No Node.js processes found" -ForegroundColor Green
}

Write-Host ""
Write-Host "Checking port 5000..." -ForegroundColor Yellow
$conn = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue

if ($conn) {
    Write-Host "⚠️ Port 5000 is still in use" -ForegroundColor Yellow
    Write-Host "You may need to:" -ForegroundColor White
    Write-Host "  1. Restart your computer" -ForegroundColor White
    Write-Host "  2. Or use a different port (edit .env: PORT=5001)" -ForegroundColor White
} else {
    Write-Host "✅ Port 5000 is now free!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now start the server:" -ForegroundColor Cyan
    Write-Host "  npm run server" -ForegroundColor White
}

