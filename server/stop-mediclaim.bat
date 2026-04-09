@echo off
setlocal
echo --------------------------------------------------
echo [STOPPING ALL MEDICLAIM SERVICES]
echo --------------------------------------------------

echo 1. Stopping Backend (Port 5000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000.*LISTENING"') do (
    taskkill /PID %%a /F /T >nul 2>&1
)

echo 2. Stopping Frontend (Port 5173)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173.*LISTENING"') do (
    taskkill /PID %%a /F /T >nul 2>&1
)

echo 3. Cleaning up orphaned Node processes...
taskkill /IM node.exe /F >nul 2>&1

echo 4. Waiting for sockets to clear...
timeout /t 2 /nobreak >nul

echo --------------------------------------------------
echo [SUCCESS] Everything has been stopped.
echo --------------------------------------------------
pause
