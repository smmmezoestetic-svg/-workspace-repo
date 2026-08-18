// index.jsx — точка входа сборки.
//
// Модули ниже подключаются строго по порядку: каждый регистрирует свои
// компоненты и данные в window.* , а следующие на них опираются.

import React from "react";
import { createRoot } from "react-dom/client";

import "./styles.css";

import "./01-i18n.jsx";
import "./02-data.jsx";
import "./03-analyzer.jsx";
import "./04-shared.jsx";
import "./05-photo.jsx";
import "./06-profile.jsx";
import "./07-scan.jsx";
import "./08-result.jsx";
import "./09-analog.jsx";

import App from "./10-app.jsx";
import { startHeightReporting } from "./embed-host.js";
import { loadCatalog, catalogState } from "./catalog.js";

// Каталог начинает грузиться сразу, но отрисовку не задерживает: товары
// нужны только на шаге результата, а до него пользователь идёт минуту.
// Шаги, которым товары действительно нужны, ждут этот промис.
window.__catalogReady = loadCatalog().then((products) => {
  if (products) window.__PRODUCTS = products;
  return products;
});
window.__catalogState = catalogState;

function mount() {
  const el = document.getElementById("mesoforia-skin-test");
  if (!el) {
    console.error("[skin-test] Не найден контейнер #mesoforia-skin-test");
    return;
  }
  createRoot(el).render(<App />);
  startHeightReporting(el);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
