// config.js — единая точка настройки виджета.
//
// Значения берутся из трёх источников, по возрастанию приоритета:
//   1. DEFAULTS ниже
//   2. window.MESOFORIA_SKIN_TEST_CONFIG (объект на странице-хосте)
//   3. query-параметры URL страницы виджета (?lang=en&accent=sage)
//
// Так один и тот же собранный файл настраивается и через iframe src,
// и через глобальный объект при inline-вставке.

const DEFAULTS = {
  // Язык интерфейса: "ru" | "en"
  lang: "ru",
  // Раскладка: "full" — во всю ширину контейнера, "widget" — карточка 480px по центру
  embed: "full",
  // Акцентный цвет: rose | sage | graphite | amber | blush
  accent: "rose",
  // Масштаб шрифта, 0.85–1.25
  fontScale: 1,
  // Куда ведут кнопки «в магазин»
  shopUrl: "https://mesoforia.ru/",
  // Эндпоинт PHP-прокси. Пустая строка — AI-функции выключены,
  // тест работает на анкете и локальном анализе фото.
  apiUrl: "",
  // Откуда брать каталог средств: catalog.php (Битрикс) или products.json.
  // Пустая строка — используется демо-каталог, зашитый в сборку.
  catalogUrl: "",
  // Принудительный тип кожи для демонстрации: "auto" или ключ типа
  demoType: "auto",
};

const NUMERIC = new Set(["fontScale"]);

function fromQuery() {
  const out = {};
  let params;
  try {
    params = new URLSearchParams(window.location.search);
  } catch {
    return out;
  }
  for (const key of Object.keys(DEFAULTS)) {
    if (!params.has(key)) continue;
    const raw = params.get(key);
    out[key] = NUMERIC.has(key) ? Number(raw) : raw;
  }
  return out;
}

let cached = null;

export function getConfig() {
  if (cached) return cached;

  const host = (typeof window !== "undefined" && window.MESOFORIA_SKIN_TEST_CONFIG) || {};
  const merged = { ...DEFAULTS, ...host, ...fromQuery() };

  // Санитайзинг — значения приходят из URL, им нельзя доверять.
  if (merged.lang !== "ru" && merged.lang !== "en") merged.lang = DEFAULTS.lang;
  if (merged.embed !== "full" && merged.embed !== "widget") merged.embed = DEFAULTS.embed;
  const fs = Number(merged.fontScale);
  merged.fontScale = Number.isFinite(fs) ? Math.min(1.25, Math.max(0.85, fs)) : 1;
  if (!isSafeUrl(merged.shopUrl)) merged.shopUrl = DEFAULTS.shopUrl;
  if (merged.apiUrl && !isSafeUrl(merged.apiUrl)) merged.apiUrl = DEFAULTS.apiUrl;
  if (merged.catalogUrl && !isSafeUrl(merged.catalogUrl)) merged.catalogUrl = DEFAULTS.catalogUrl;

  cached = merged;
  return cached;
}

// Пропускаем только http(s) и относительные пути — иначе javascript:-URL
// из query-параметра попадёт в href кнопки «в магазин».
function isSafeUrl(value) {
  if (typeof value !== "string" || value === "") return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const proto = new URL(value, window.location.href).protocol;
    return proto === "http:" || proto === "https:";
  } catch {
    return false;
  }
}
