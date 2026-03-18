@echo off
echo Starting Mediclaim System...
cd /d "%~dp0"
npm run dev -- --host --port 5173
pause
