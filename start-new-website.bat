@echo off
chcp 65001 > nul
echo ========================================================
echo   تشغيل موقع الحلم الجديد (El7lm Website) محلياً
echo ========================================================
echo.
echo المسار: %~dp0el7lm-website\el7lm-website
echo المنفذ: http://localhost:8000
echo.

cd /d "%~dp0el7lm-website\el7lm-website"

start "" "http://localhost:8000"
python -m http.server 8000

pause
