@echo off
REM Financial Chatbot v6 - Excel to Supabase Migration (v2 Schema)
REM
REM Usage: Double-click this file to run migration
REM
REM Prerequisites:
REM   1. Python 3 with: openpyxl, pandas, supabase
REM   2. Set environment variables:
REM      set SUPABASE_URL=https://brgpgwxzxryefulblbgx.supabase.co
REM      set SUPABASE_KEY=your-service-role-key-here

set SUPABASE_URL=https://brgpgwxzxryefulblbgx.supabase.co
REM set SUPABASE_KEY=your-service-role-key-here

if "%SUPABASE_KEY%"=="your-service-role-key-here" (
    echo ERROR: Set SUPABASE_KEY before running!
    echo   set SUPABASE_KEY=your-service-role-key
    pause
    exit /b 1
)

echo ========================================
echo Financial Chatbot v6 - Migration (v2)
echo ========================================
echo.

cd /d "%~dp0.."

python supabase\migrate_excel_to_supabase_v2.py --input-dir "G:\My Drive\Ai Chatbot Knowledge Base\Processing"

echo.
echo ========================================
echo Migration complete!
echo ========================================
pause
