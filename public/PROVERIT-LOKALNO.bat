@echo off
chcp 65001 >nul
title Проверка теста по типу кожи

rem Запускает тест на вашем компьютере — так же, как он будет работать
rem на сайте, вместе с детектором лиц из папки vendor.
rem
rem Просто открыть index.html двойным щелчком нельзя: браузер не даёт
rem странице, открытой как файл, подгружать детектор. Нужен локальный
rem веб-сервер — его и поднимает этот файл.

cd /d "%~dp0"

echo.
echo   Запускаю тест на http://localhost:8765/demo.html
echo   Браузер откроется сам через пару секунд.
echo.
echo   Чтобы остановить — закройте это окно.
echo.

start "" /b cmd /c "timeout /t 3 >nul & start """" http://localhost:8765/demo.html"

where py >nul 2>nul && (
  py -3 -m http.server 8765
  goto :eof
)

where python >nul 2>nul && (
  python -m http.server 8765
  goto :eof
)

where npx >nul 2>nul && (
  npx --yes http-server -p 8765
  goto :eof
)

echo.
echo   Не найдено ни Python, ни Node.js — запустить сервер нечем.
echo.
echo   Что можно сделать:
echo     1. Установить Python с https://python.org (галочка
echo        "Add Python to PATH" при установке) и запустить этот файл снова.
echo     2. Либо залить папку skin-test-app на хостинг по FTP и открыть
echo        https://ваш-сайт/skin-test-app/demo.html — на сайт это никак
echo        не влияет, ничего никуда не подключается.
echo.
pause
