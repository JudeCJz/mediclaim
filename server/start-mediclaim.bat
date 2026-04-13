@echo off
echo ========================================
echo    Starting Mediclaim System
echo ========================================
echo.

echo [1/4] Starting MongoDB...
start "MongoDB" powershell -NoExit -Command "& 'C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe' --dbpath C:\data\db"
timeout /t 3 /nobreak > nul

echo [2/4] Starting Backend...
start "Backend" powershell -NoExit -Command "cd D:\VS\PROJECTS\MediclaimSystem\server; Write-Host 'Backend Server - http://localhost:5000' -ForegroundColor Cyan; npm run dev"
timeout /t 2 /nobreak > nul

echo [3/4] Starting Frontend...
start "Frontend" powershell -NoExit -Command "cd D:\VS\PROJECTS\MediclaimSystem; Write-Host 'Frontend - http://localhost:5173' -ForegroundColor Cyan; npm run dev"
timeout /t 3 /nobreak > nul

echo [4/4] Opening Browser...
start http://localhost:5173

echo.
echo ========================================
echo    Mediclaim System Started!
echo ========================================
echo.
echo Access at: http://localhost:5173
echo.
echo Login: admin@college.edu / admin@college.edu
echo.
echo Keep all windows open while using the app
echo.
pause