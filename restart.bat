@echo off
:: OTOTEST Web Sunucusu Yöneticisi

echo ================================
echo OTOTEST Web Sunucusu
echo ================================
echo.

:: Port 3030 kontrolu
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3030\*"') do (
    set web_running=1
    echo Web sunucusu calisiyor (PID: %%a)
)

if not defined web_running (
    echo Web sunucusu calismiyor.
)

echo.
echo Port 3030 temizleniyor...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3030') do taskkill /f /pid %%a 2>nul

echo.
echo Sunucu baslatiliyor (port 3030)...
start /MIN "OTOTEST Web" cmd /c "cd /d "%~dp0web" && npm run dev"

echo.
echo Sunucunun hazirlanmasi bekleniyor (5 saniye)...
timeout /t 5 /nobreak >nul

echo Tarayicida aciliyor...
start "" http://localhost:3030

echo.
echo Baslatildi! Pencere kapatiliyor...
timeout /t 2 /nobreak >nul
exit
