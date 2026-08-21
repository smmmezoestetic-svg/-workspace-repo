#!/bin/sh
# Запускает тест на вашем компьютере (macOS и Linux) — так же, как он будет
# работать на сайте, вместе с детектором лиц из папки vendor.
#
# Просто открыть index.html двойным щелчком нельзя: браузер не даёт странице,
# открытой как файл, подгружать детектор. Нужен локальный веб-сервер — его и
# поднимает этот файл.
#
# На macOS может потребоваться один раз разрешить запуск:
# правый клик по файлу → «Открыть».

cd "$(dirname "$0")" || exit 1

PORT=8765
URL="http://localhost:$PORT/demo.html"

echo
echo "  Запускаю тест на $URL"
echo "  Браузер откроется сам через пару секунд."
echo
echo "  Чтобы остановить — нажмите Ctrl+C или закройте это окно."
echo

( sleep 3
  if command -v open >/dev/null 2>&1; then open "$URL"
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL"
  fi ) &

if command -v python3 >/dev/null 2>&1; then
  exec python3 -m http.server "$PORT"
elif command -v python >/dev/null 2>&1; then
  exec python -m http.server "$PORT"
elif command -v npx >/dev/null 2>&1; then
  exec npx --yes http-server -p "$PORT"
fi

echo
echo "  Не найдено ни Python, ни Node.js — запустить сервер нечем."
echo
echo "  Что можно сделать:"
echo "    1. Установить Python с https://python.org и запустить файл снова."
echo "    2. Либо залить папку skin-test-app на хостинг по FTP и открыть"
echo "       https://ваш-сайт/skin-test-app/demo.html — на сайт это никак"
echo "       не влияет, ничего никуда не подключается."
echo
read -r _
