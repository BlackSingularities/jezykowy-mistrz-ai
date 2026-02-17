@echo off
title Wloski Mistrz AI - Dev
echo ============================================
echo   Wloski Mistrz AI - tryb deweloperski
echo ============================================
echo.

:: Sprawdz czy node_modules istnieje
if not exist "node_modules\" (
    echo [*] Brak node_modules - instalowanie zaleznosci...
    npm install
    if errorlevel 1 (
        echo [BLAD] npm install nie powiodl sie.
        pause
        exit /b 1
    )
    echo.
)

echo [*] Uruchamianie serwera deweloperskiego...
echo [*] Aplikacja bedzie dostepna pod: http://localhost:3000
echo.
npm run dev

pause
