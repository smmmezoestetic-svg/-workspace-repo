// embed.js — то, что подключается на странице сайта.
//
// Ищет на странице <div data-mesoforia-skin-test> и вставляет в него iframe
// с виджетом. Iframe сам сообщает свою высоту, поэтому внутри теста нет
// второй полосы прокрутки, а блок на странице растёт и сжимается по шагам.
//
// Подключение на mesoforia.ru/skin-test/:
//   <div data-mesoforia-skin-test data-src="/skin-test-app/index.html"></div>
//   <script src="/skin-test-app/embed.js" defer></script>

(function () {
  "use strict";

  var CHANNEL = "mesoforia-skin-test";
  var DEFAULT_SRC = "/skin-test-app/index.html";
  var MIN_HEIGHT = 560;

  function init(host) {
    if (host.getAttribute("data-mesoforia-ready") === "1") return;
    host.setAttribute("data-mesoforia-ready", "1");

    var src = host.getAttribute("data-src") || DEFAULT_SRC;

    // Настройки прокидываем в query — так одна и та же собранная страница
    // виджета обслуживает разные варианты вставки.
    var params = [];
    ["lang", "embed", "accent", "fontScale", "shopUrl"].forEach(function (key) {
      var value = host.getAttribute("data-" + key.toLowerCase());
      if (value) params.push(encodeURIComponent(key) + "=" + encodeURIComponent(value));
    });
    if (params.length) src += (src.indexOf("?") === -1 ? "?" : "&") + params.join("&");

    var iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.title = "Подбор ухода по типу кожи";
    iframe.loading = "lazy";
    // Камера и файлы нужны шагу с фото; iframe с другого origin без allow
    // получит отказ на getUserMedia.
    iframe.allow = "camera; clipboard-write";
    iframe.setAttribute("scrolling", "no");
    iframe.style.cssText =
      "display:block;width:100%;border:0;overflow:hidden;height:" + MIN_HEIGHT + "px;";

    host.appendChild(iframe);

    window.addEventListener("message", function (event) {
      if (event.source !== iframe.contentWindow) return;
      var data = event.data;
      if (!data || data.channel !== CHANNEL) return;

      if (data.type === "height") {
        var h = Number(data.height);
        if (isFinite(h) && h > 0) iframe.style.height = Math.max(MIN_HEIGHT, h) + "px";
      } else if (data.type === "scrollTop") {
        // Виджет перешёл на следующий шаг — подтягиваем страницу к его началу,
        // но только если верх блока уже ушёл вверх за пределы экрана.
        var top = host.getBoundingClientRect().top;
        if (top < 0) window.scrollTo({ top: window.pageYOffset + top - 16, behavior: "smooth" });
      }
    });
  }

  function boot() {
    var hosts = document.querySelectorAll("[data-mesoforia-skin-test]");
    for (var i = 0; i < hosts.length; i++) init(hosts[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
