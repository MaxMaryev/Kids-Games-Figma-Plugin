@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo Updating Kids Games Figma Plugin from GitHub (no Git)...
node update-plugin.cjs
if errorlevel 1 (
  echo Update failed. Need Node.js, curl and tar (Windows 10+).
  pause
  exit /b 1
)
call npm install
if errorlevel 1 (
  echo npm install failed.
  pause
  exit /b 1
)
call npm run build
if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)
echo Done.
pause
exit /b 0
