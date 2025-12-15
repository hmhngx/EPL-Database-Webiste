# Start Backend Server Script
# This script starts the Express backend server

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Premier League API Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-not (Test-Path .env)) {
    Write-Host "❌ ERROR: .env file not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please create .env file with your Supabase credentials:" -ForegroundColor Yellow
    Write-Host "1. Copy .env.example to .env" -ForegroundColor White
    Write-Host "2. Edit .env and add your SUPABASE_CONNECTION_STRING" -ForegroundColor White
    Write-Host ""
    Write-Host "Or run: .\setup-supabase.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ .env file found" -ForegroundColor Green
Write-Host ""
Write-Host "Starting server on http://localhost:5000..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""
Write-Host "Keep this terminal open while developing!" -ForegroundColor Yellow
Write-Host ""

# Start the server
npm run server

