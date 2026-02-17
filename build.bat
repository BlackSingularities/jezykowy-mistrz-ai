@echo off
title Wloski Mistrz AI - Build
echo ============================================
echo   Wloski Mistrz AI - budowanie produkcyjne
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

echo [*] Budowanie aplikacji...
npm run build

if errorlevel 1 (
    echo.
    echo [BLAD] Build nie powiodl sie. Sprawdz bledy powyzej.
    pause
    exit /b 1
)

echo.
echo [OK] Build gotowy! Pliki znajduja sie w folderze: dist\
echo [*] Aby podejrzec produkcyjny build lokalnie, uruchom: npm run preview
echo.
pause
