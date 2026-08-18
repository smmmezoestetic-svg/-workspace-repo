// catalog.js — загрузка каталога средств из внешнего источника.
//
// Тест умеет работать с двумя источниками:
//   1. catalogUrl не задан — берётся демо-каталог, зашитый в 02-data.jsx.
//      Это режим для просмотра и отладки.
//   2. catalogUrl задан — товары приходят оттуда (catalog.php из Битрикса
//      либо статический products.json).
//
// Когда catalogUrl задан, демо-каталог НЕ используется как запасной вариант:
// показать покупателю выдуманные средства с выдуманными ценами хуже, чем
// честно сказать, что подборка временно недоступна.

import { getConfig } from "./config.js";

export const CATEGORIES = [
  "cleanser", "toner", "serum", "eye", "moist", "spf", "mask", "exfoliant",
];

export const SKIN_TYPES = [
  "normal", "dry", "oily", "combo", "sensitive", "acne", "mature", "dehydrated",
];

export const GOALS = [
  "hydration", "antiage", "pigment", "acne", "pores", "redness", "glow", "eyes",
];

// Шаг рутины однозначно следует из категории, поэтому отдельное поле в
// карточке товара заводить не нужно.
const STEP_BY_CATEGORY = {
  cleanser: "cleanse",
  toner: "tone",
  serum: "serum",
  eye: "eye",
  moist: "moist",
  spf: "spf",
  mask: "weekly",
  exfoliant: "weekly",
};

const REQUEST_TIMEOUT_MS = 8000;

let loadPromise = null;

/**
 * Состояние загрузки для интерфейса:
 *   source: "builtin" | "remote"
 *   ok:     удалось ли получить товары
 */
export const catalogState = { source: "builtin", ok: true };

/**
 * Запускает загрузку один раз и возвращает тот же промис при повторных
 * вызовах. Промис никогда не отклоняется — ошибка превращается в пустой
 * список, чтобы одна неудачная загрузка не роняла весь тест.
 */
export function loadCatalog() {
  if (loadPromise) return loadPromise;

  const { catalogUrl } = getConfig();
  if (!catalogUrl) {
    catalogState.source = "builtin";
    catalogState.ok = true;
    loadPromise = Promise.resolve(null); // null — «оставить демо-каталог»
    return loadPromise;
  }

  catalogState.source = "remote";
  loadPromise = fetchCatalog(catalogUrl)
    .then((products) => {
      catalogState.ok = products.length > 0;
      if (!catalogState.ok) {
        console.error("[catalog] Каталог получен, но в нём нет ни одного пригодного товара");
      }
      return products;
    })
    .catch((error) => {
      catalogState.ok = false;
      console.error("[catalog] Не удалось загрузить каталог:", error.message);
      return [];
    });

  return loadPromise;
}

async function fetchCatalog(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(url, { signal: controller.signal, credentials: "omit" });
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const payload = await response.json();
  const raw = Array.isArray(payload) ? payload : payload?.products;
  if (!Array.isArray(raw)) {
    throw new Error("Ожидался массив products");
  }

  const products = [];
  const rejected = [];
  raw.forEach((item, index) => {
    const product = normalizeProduct(item, index);
    if (product) products.push(product);
    else rejected.push(item?.id ?? `#${index}`);
  });

  if (rejected.length) {
    console.warn(
      `[catalog] Пропущено товаров из-за незаполненных или неверных полей: ${rejected.length}`,
      rejected
    );
  }
  warnAboutMissingCategories(products);

  return products;
}

/**
 * Приводит запись из внешнего источника к той форме, которую ждёт тест.
 * Возвращает null, если запись непригодна — такой товар просто не попадёт
 * в подбор, вместо того чтобы сломать отрисовку.
 */
function normalizeProduct(item, index) {
  if (!item || typeof item !== "object") return null;

  const category = String(item.category || "").trim();
  if (!CATEGORIES.includes(category)) return null;

  const name = normalizeName(item.name);
  if (!name) return null;

  const price = Number(item.price);
  if (!Number.isFinite(price) || price < 0) return null;

  const types = filterKnown(item.types, SKIN_TYPES);
  if (!types.length) return null; // без типов кожи товар не подберётся никогда

  return {
    id: String(item.id ?? `cat-${index}`),
    category,
    step: STEP_BY_CATEGORY[category],
    name,
    price,
    volume: typeof item.volume === "string" ? item.volume : "",
    actives: normalizeActives(item.actives),
    types,
    goals: filterKnown(item.goals, GOALS),
    url: safeUrl(item.url),
    image: safeUrl(item.image),
  };
}

function normalizeName(value) {
  if (typeof value === "string" && value.trim()) {
    const ru = value.trim();
    return { ru, en: ru };
  }
  if (value && typeof value === "object") {
    const ru = typeof value.ru === "string" ? value.ru.trim() : "";
    const en = typeof value.en === "string" ? value.en.trim() : "";
    if (ru || en) return { ru: ru || en, en: en || ru };
  }
  return null;
}

function normalizeActives(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((a) => typeof a === "string" && a.trim())
    .map((a) => a.trim())
    .slice(0, 8);
}

function filterKnown(value, allowed) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value
    .map((v) => String(v).trim())
    .filter((v) => allowed.includes(v) && !seen.has(v) && (seen.add(v), true));
}

// Ссылки и картинки приходят из чужой системы и попадают в href и src,
// поэтому пропускаем только относительные пути и http(s).
function safeUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  const url = value.trim();
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  try {
    const proto = new URL(url, window.location.href).protocol;
    return proto === "http:" || proto === "https:" ? url : "";
  } catch {
    return "";
  }
}

// Без товаров в категории соответствующий шаг просто выпадет из рутины.
// Это нормально, если магазин не продаёт, скажем, SPF, но чаще означает
// незаполненное свойство — поэтому пишем в консоль.
function warnAboutMissingCategories(products) {
  const present = new Set(products.map((p) => p.category));
  const missing = CATEGORIES.filter((c) => !present.has(c));
  if (missing.length) {
    console.warn(
      "[catalog] Нет ни одного товара в категориях: " + missing.join(", ") +
      " — эти шаги не попадут в рутину."
    );
  }
}
