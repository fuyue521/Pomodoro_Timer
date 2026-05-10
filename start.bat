@echo off
cd /d "%~dp0"

if not exist "node_modules" (
    echo [1/2] Installing dependencies...
    call npm install
    echo.
)

echo [2/2] Starting dev server...
echo Open http://localhost:5173 in browser
echo Press Ctrl+C to stop
echo.
call npm run dev
pause
