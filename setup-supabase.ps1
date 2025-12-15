# Supabase Setup Script for Windows
# This script helps you set up your Supabase credentials

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Supabase Configuration Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env already exists
if (Test-Path .env) {
    Write-Host "⚠️  .env file already exists!" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to overwrite it? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "Setup cancelled." -ForegroundColor Yellow
        exit
    }
}

Write-Host "Please provide your Supabase credentials:" -ForegroundColor Green
Write-Host ""

# Get Supabase connection details
$projectRef = Read-Host "Enter your Supabase Project Reference ID"
$password = Read-Host "Enter your Database Password" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
)

# URL encode password if it contains special characters
$passwordEncoded = [System.Web.HttpUtility]::UrlEncode($passwordPlain)

# Build connection string
$connectionString = "postgresql://postgres:${passwordEncoded}@db.${projectRef}.supabase.co:5432/postgres"

# Create .env file
$envContent = @"
# ============================================
# Supabase Database Configuration
# ============================================
# Generated on $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
SUPABASE_CONNECTION_STRING=$connectionString

# ============================================
# Server Configuration
# ============================================
PORT=5000
NODE_ENV=development

# ============================================
# Frontend Configuration
# ============================================
FRONTEND_URL=http://localhost:5173
"@

$envContent | Out-File -FilePath .env -Encoding utf8

Write-Host ""
Write-Host "✅ .env file created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run the database schema: Open Supabase Dashboard → SQL Editor" -ForegroundColor White
Write-Host "2. Copy and run the contents of database/schema.sql" -ForegroundColor White
Write-Host "3. Start the server: npm run server" -ForegroundColor White
Write-Host "4. Test the connection: curl http://localhost:5000/health" -ForegroundColor White
Write-Host ""
Write-Host "For detailed instructions, see SUPABASE_SETUP.md" -ForegroundColor Yellow

