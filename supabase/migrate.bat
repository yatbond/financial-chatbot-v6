@echo off
REM ============================================
REM Financial Chatbot v6 - Excel to Supabase
REM ============================================
REM Usage: Double-click this file, or run from command line
REM
REM Before running:
REM 1. Copy all Excel files to: G:\My Drive\Ai Chatbot Knowledge Base\Processing\
REM 2. Update SUPABASE_URL and SUPABASE_KEY below (if changed)
REM ============================================

echo.
echo ============================================
echo  Financial Chatbot v6 - Supabase Migration
echo ============================================
echo.

REM Set Supabase credentials
set SUPABASE_URL=https://brgpgwxzxryefulblbgx.supabase.co
set SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZ3Bnd3h6eHJ5ZWZ1bGJsYmd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTgxNDI3MiwiZXhwIjoyMDkxMzkwMjcyfQ.Y9Er-R2BTB7PK2l4vpP28gqWCklAegYJa5DhmSpfe_4

REM Set input directory
set INPUT_DIR=G:\My Drive\Ai Chatbot Knowledge Base\Processing

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found! Please install Python 3.8+
    echo Download from: https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Check if input directory exists
if not exist "%INPUT_DIR%" (
    echo [ERROR] Input directory not found: %INPUT_DIR%
    echo Please copy your Excel files to this folder first.
    pause
    exit /b 1
)

REM Run migration script
echo [INFO] Starting migration...
echo [INFO] Input: %INPUT_DIR%
echo [INFO] Supabase: %SUPABASE_URL%
echo.

python "%~dp0migrate_excel_to_supabase.py" --input-dir "%INPUT_DIR%"

echo.
echo ============================================
echo  Migration Complete!
echo ============================================
echo.
echo Next steps:
echo 1. Check Supabase dashboard to verify data
echo 2. Add SUPABASE_URL and SUPABASE_KEY to Vercel
echo 3. Redeploy v6 site
echo.
pause
