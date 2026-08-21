// embed-host.js — связь виджета внутри iframe с родительской страницей.
//
// Виджет живёт в iframe без собственной прокрутки: он сообщает наверх свою
// высоту, а embed.js на странице сайта подгоняет высоту iframe. Отсюда же
// уходит просьба прокрутить родительскую страницу к началу теста при
// переходе между шагами — иначе после клика «Далее» пользователь остаётся
// смотреть на середину предыдущего экрана.

const CHANNEL = "mesoforia-skin-test";

export function inIframe() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function post(type, payload) {
  if (!inIframe()) return;
  // targetOrigin "*": высота и «прокрути вверх» не содержат персональных
  // данных, а origin родителя виджету заранее неизвестен.
  window.parent.postMessage({ channel: CHANNEL, type, ...payload }, "*");
}

export function startHeightReporting(el) {
  if (!inIframe() || !el) return () => {};

  let last = -1;
  const report = () => {
    const height = Math.ceil(el.getBoundingClientRect().height);
    if (height > 0 && height !== last) {
      last = height;
      post("height", { height });
    }
  };

  const ro = new ResizeObserver(report);
  ro.observe(el);
  window.addEventListener("load", report);
  // Веб-шрифты меняют метрики после первой отрисовки.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(report);
  report();

  return () => {
    ro.disconnect();
    window.removeEventListener("load", report);
  };
}

// Прокрутка к началу шага: внутри iframe просим об этом родителя,
// в обычной вставке скроллим сами.
export function scrollToTop() {
  if (inIframe()) {
    post("scrollTop", {});
  } else {
    window.scrollTo({ top: 0, behavior: "instant" });
  }
}
