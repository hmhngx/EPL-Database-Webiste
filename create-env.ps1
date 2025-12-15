# PowerShell script to create .env file from template
# Run this script to set up your environment variables

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Creating .env file from template" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$envExample = "server\env.example"
$envFile = ".env"

if (Test-Path $envFile) {
    Write-Host "⚠ WARNING: .env file already exists!" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to overwrite it? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "Cancelled. Existing .env file preserved." -ForegroundColor Yellow
        exit 0
    }
}

if (Test-Path $envExample) {
    Copy-Item $envExample $envFile
    Write-Host "✓ Created .env file from template" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠ IMPORTANT: You need to edit .env and add your Supabase connection string!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Steps:" -ForegroundColor Cyan
    Write-Host "1. Open .env file in a text editor" -ForegroundColor White
    Write-Host "2. Replace [YOUR-PASSWORD] with your Supabase database password" -ForegroundColor White
    Write-Host "3. Replace [YOUR-PROJECT-REF] with your Supabase project reference ID" -ForegroundColor White
    Write-Host ""
    Write-Host "Example:" -ForegroundColor Cyan
    Write-Host "  SUPABASE_CONNECTION_STRING=postgresql://postgres:MyPassword123@db.abcdefghijklmnop.supabase.co:5432/postgres" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Get your connection string from:" -ForegroundColor Cyan
    Write-Host "  Supabase Dashboard → Settings → Database → Connection string" -ForegroundColor White
    Write-Host ""
    
    # Try to open the file in default editor
    $open = Read-Host "Open .env file in editor now? (Y/n)"
    if ($open -ne "n" -and $open -ne "N") {
        notepad $envFile
    }
} else {
    Write-Host "✗ ERROR: Template file not found: $envExample" -ForegroundColor Red
    Write-Host "Please create .env manually with SUPABASE_CONNECTION_STRING" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Done! Remember to fill in your connection string." -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan

