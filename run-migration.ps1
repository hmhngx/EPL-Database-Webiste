# Run Database Migration Script
# This script runs SQL migrations against the Supabase database

param(
    [Parameter(Mandatory=$true)]
    [string]$MigrationFile
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Database Migration Runner" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-not (Test-Path .env)) {
    Write-Host "❌ ERROR: .env file not found!" -ForegroundColor Red
    Write-Host "Please create .env file with your database credentials." -ForegroundColor Yellow
    exit 1
}

# Load environment variables
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        if ($name -and $value) {
            [System.Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

$connectionString = $env:SUPABASE_CONNECTION_STRING

if (-not $connectionString) {
    Write-Host "❌ ERROR: SUPABASE_CONNECTION_STRING not found in .env" -ForegroundColor Red
    exit 1
}

# Check if migration file exists
if (-not (Test-Path $MigrationFile)) {
    Write-Host "❌ ERROR: Migration file not found: $MigrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "✅ .env file found" -ForegroundColor Green
Write-Host "✅ Migration file found: $MigrationFile" -ForegroundColor Green
Write-Host ""

# Check if psql is available
$psqlAvailable = $false
try {
    $null = Get-Command psql -ErrorAction Stop
    $psqlAvailable = $true
} catch {
    Write-Host "⚠ psql command not found. Attempting to use Node.js instead..." -ForegroundColor Yellow
}

if ($psqlAvailable) {
    Write-Host "Running migration with psql..." -ForegroundColor Cyan
    Write-Host ""
    
    # Run migration with psql
    psql $connectionString -f $MigrationFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ Migration failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        exit $LASTEXITCODE
    }
} else {
    Write-Host "Running migration with Node.js..." -ForegroundColor Cyan
    Write-Host ""
    
    # Create temporary Node.js script
    $nodeScript = @"
import pkg from 'pg';
const { Client } = pkg;
import { readFileSync } from 'fs';

const client = new Client({
    connectionString: process.env.SUPABASE_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false }
});

async function runMigration() {
    try {
        await client.connect();
        console.log('✅ Connected to database');
        
        const sql = readFileSync('$MigrationFile', 'utf8');
        await client.query(sql);
        
        console.log('✅ Migration executed successfully');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
"@
    
    $tempScript = "temp-migration-$(Get-Random).mjs"
    $nodeScript | Out-File -FilePath $tempScript -Encoding UTF8
    
    try {
        node $tempScript
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "❌ Migration failed" -ForegroundColor Red
            exit $LASTEXITCODE
        }
    } finally {
        # Clean up temp script
        if (Test-Path $tempScript) {
            Remove-Item $tempScript
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
