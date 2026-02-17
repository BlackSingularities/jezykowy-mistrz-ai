@echo off
chcp 65001 >nul
echo ============================================
echo   Wloski Mistrz AI - tryb deweloperski
echo ============================================
echo.

if not exist "node_modules" (
    echo Brak node_modules. Instalowanie zaleznosci...
    call npm install
    if errorlevel 1 (
        echo BLAD: npm install nie powiodl sie.
        pause
        exit /b 1
    )
    echo.
)

echo Uruchamianie serwera deweloperskiego...
echo Aplikacja bedzie dostepna pod adresem: http://localhost:3000
echo.
echo Nacisnij Ctrl+C aby zatrzymac serwer.
echo.
call npm run dev
