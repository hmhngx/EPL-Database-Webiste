# Kill process using port 5000
Write-Host "Finding process using port 5000..." -ForegroundColor Cyan

$connection = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object -First 1

if ($connection) {
    $processId = $connection.OwningProcess
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    
    if ($process) {
        Write-Host "Found process:" -ForegroundColor Yellow
        Write-Host "  PID: $processId" -ForegroundColor White
        Write-Host "  Name: $($process.ProcessName)" -ForegroundColor White
        Write-Host "  Path: $($process.Path)" -ForegroundColor White
        Write-Host ""
        Write-Host "Killing process..." -ForegroundColor Cyan
        
        try {
            Stop-Process -Id $processId -Force
            Write-Host "✅ Process killed successfully!" -ForegroundColor Green
            Write-Host "Port 5000 is now free." -ForegroundColor Green
            Start-Sleep -Seconds 2
        } catch {
            Write-Host "❌ Error killing process: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "Process not found (may have already exited)" -ForegroundColor Yellow
    }
} else {
    Write-Host "No process found using port 5000" -ForegroundColor Green
    Write-Host "Checking for Node.js processes..." -ForegroundColor Cyan
    
    $nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        Write-Host "Found Node.js processes:" -ForegroundColor Yellow
        $nodeProcesses | ForEach-Object {
            Write-Host "  PID: $($_.Id) - $($_.Path)" -ForegroundColor White
        }
        Write-Host ""
        Write-Host "You may want to kill these Node.js processes:" -ForegroundColor Yellow
        Write-Host "  Stop-Process -Id <PID> -Force" -ForegroundColor White
    } else {
        Write-Host "No Node.js processes found" -ForegroundColor Green
    }
}

