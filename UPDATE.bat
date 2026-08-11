@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo Обновление Kids Games Figma Plugin...
node update-plugin.cjs
if errorlevel 1 (
  echo.
  echo Не удалось обновить. Нужны Node.js, curl и tar ^(Windows 10+^).
  pause
  exit /b 1
)
pause
exit /b 0
