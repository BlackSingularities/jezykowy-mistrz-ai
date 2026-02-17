@echo off
chcp 65001 >nul
echo ============================================
echo   Wloski Mistrz AI - budowanie produkcji
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

echo Budowanie projektu...
call npm run build
if errorlevel 1 (
    echo BLAD: Budowanie nie powiodlo sie.
    pause
    exit /b 1
)

echo.
echo Gotowe! Pliki produkcyjne sa w katalogu: dist\
echo Aby podejrzec zbudowana aplikacje, uruchom: npm run preview
echo.
pause
