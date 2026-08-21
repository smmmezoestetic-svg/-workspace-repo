// build-preview.mjs — одностраничная версия теста для проверки без хостинга.
//
// Складывает CSS и JS внутрь одного HTML-файла: его можно открыть двойным
// щелчком, отправить в мессенджере или выложить куда угодно. Каталог и
// AI-разбор выключены — это превью интерфейса и сценария, не боевой режим.
//
//   npm run preview   →   dist/preview.html
import { readFileSync, writeFileSync } from 'node:fs';

const css = readFileSync('dist/skin-test.css', 'utf8').replace(/\/\*# sourceMappingURL=.*?\*\//g, '');
const js  = readFileSync('dist/skin-test.js', 'utf8').replace(/\/\/# sourceMappingURL=.*$/m, '');

const out = `<title>Тест по типу кожи</title>

<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"/>

<style>
${css}

/* Страница-превью: виджет разворачивается во всю ширину, поверх — полоса
   с пояснением. Полоса намеренно построена на токенах самого виджета,
   чтобы не выглядеть приклеенной снаружи. Тема одна, светлая: это
   фирменная палитра теста, и она задаётся явно на :root в CSS выше. */
body { margin: 0; background: var(--bg); color: var(--ink); }
#mesoforia-skin-test .app { min-height: 0; }

.preview-note {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 14px;
  padding: 12px clamp(18px, 4vw, 36px);
  background: var(--surface);
  border-bottom: 1px solid var(--line);
  font-family: var(--font-ui);
  font-size: 13px;
  line-height: 1.5;
  color: var(--ink-3);
}
.preview-note b {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--ink-4);
  white-space: nowrap;
}
</style>

<div class="preview-note">
  <b>Превью</b>
  <span>Полный сценарий рабочий. Средства и цены — демонстрационные,
  а проверка «на фото лицо» и AI-разбор здесь урезаны: детектор лиц весит
  около 10 МБ и лежит рядом с виджетом на сайте — в эту одностраничную
  версию он не помещается. Поэтому здесь фото проверяется грубой эвристикой
  и посторонний предмет может пройти. На сайте этим занимается настоящий
  детектор.</span>
</div>

<script>
  window.MESOFORIA_SKIN_TEST_CONFIG = {
    lang: "ru", embed: "full", accent: "rose", fontScale: 1,
    shopUrl: "https://mesoforia.ru/",
    apiUrl: "", catalogUrl: ""
  };
</script>

<div id="mesoforia-skin-test"></div>

<script>
${js}
</script>
`;
writeFileSync(process.argv[2] || 'dist/preview.html', out);
console.log('готово,', (out.length / 1024).toFixed(0), 'КБ');
