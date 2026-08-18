<?php
/**
 * catalog.php — отдаёт виджету список средств из каталога Битрикса.
 *
 * Берёт из инфоблока те товары, у которых проставлена галочка «Участвует
 * в тесте», и отдаёт их в формате, который понимает виджет. Снял галочку —
 * товар пропал из подбора; поставил — появился. Цены, фото и ссылки берутся
 * из самой карточки товара, поэтому расходиться с магазином им негде.
 *
 * Установка: положить рядом с proxy.php, в /skin-test-app/api/.
 * Настройки — в catalog-config.php (см. catalog-config.sample.php).
 */

declare(strict_types=1);

require_once __DIR__ . '/catalog-helpers.php';

// ── Конфигурация ────────────────────────────────────────────────────────────
$configCandidates = [
    __DIR__ . '/../../../skin-test-catalog-config.php',
    __DIR__ . '/../../skin-test-catalog-config.php',
    __DIR__ . '/catalog-config.php',
];
$config = [];
foreach ($configCandidates as $path) {
    if (is_readable($path)) {
        $config = require $path;
        break;
    }
}

$iblockId       = (int)($config['iblock_id'] ?? 0);
$allowedOrigins = $config['allowed_origins'] ?? ['https://mesoforia.ru', 'https://www.mesoforia.ru'];
$props          = $config['properties'] ?? [];
$flagProp       = $props['flag']     ?? 'USE_IN_SKIN_TEST';
$categoryProp   = $props['category'] ?? 'SKIN_TEST_CATEGORY';
$typesProp      = $props['types']    ?? 'SKIN_TEST_TYPES';
$goalsProp      = $props['goals']    ?? 'SKIN_TEST_GOALS';
$activesProp    = $props['actives']  ?? 'SKIN_TEST_ACTIVES';
$volumeProp     = $props['volume']   ?? 'VOLUME';
$cacheTtl       = (int)($config['cache_ttl'] ?? 600);
$cacheDir       = $config['cache_dir'] ?? sys_get_temp_dir() . '/mesoforia-skin-test-catalog';
$onlyInStock    = (bool)($config['only_in_stock'] ?? true);
$maxItems       = (int)($config['max_items'] ?? 500);
$valueMaps      = $config['value_maps'] ?? [];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Max-Age: 86400');
    http_response_code(204);
    exit;
}

if ($iblockId <= 0) {
    header('Cache-Control: no-store');
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'Не задан iblock_id в настройках каталога']], JSON_UNESCAPED_UNICODE);
    exit;
}

// ── Кэш ─────────────────────────────────────────────────────────────────────
// Каталог меняется редко, а тест проходят многие — без кэша каждый посетитель
// заставлял бы Битрикс перебирать инфоблок заново.
$cacheFile = rtrim($cacheDir, '/') . '/catalog-' . $iblockId . '.json';
if ($cacheTtl > 0 && is_readable($cacheFile) && (time() - (int)filemtime($cacheFile)) < $cacheTtl) {
    header('Cache-Control: public, max-age=' . $cacheTtl);
    readfile($cacheFile);
    exit;
}

// ── Загрузка Битрикса ───────────────────────────────────────────────────────
define('NO_KEEP_STATISTIC', true);
define('NOT_CHECK_PERMISSIONS', true);
define('NO_AGENT_CHECK', true);
define('DisableEventsCheck', true);

$prolog = ($_SERVER['DOCUMENT_ROOT'] ?? '') . '/bitrix/modules/main/include/prolog_before.php';
if (!is_readable($prolog)) {
    // Запасной путь: два уровня вверх от /skin-test-app/api/ — корень сайта.
    $prolog = __DIR__ . '/../../bitrix/modules/main/include/prolog_before.php';
}
if (!is_readable($prolog)) {
    header('Cache-Control: no-store');
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'Не найдено ядро Битрикса']], JSON_UNESCAPED_UNICODE);
    exit;
}
require_once $prolog;

if (!CModule::IncludeModule('iblock')) {
    header('Cache-Control: no-store');
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'Не подключён модуль iblock']], JSON_UNESCAPED_UNICODE);
    exit;
}
$hasCatalog = CModule::IncludeModule('catalog');

// ── Выборка ─────────────────────────────────────────────────────────────────
$filter = [
    'IBLOCK_ID'                 => $iblockId,
    'ACTIVE'                    => 'Y',
    'ACTIVE_DATE'               => 'Y',
    '!PROPERTY_' . $flagProp    => false, // галочка проставлена
];

$priceProp = $props['price'] ?? '';

$select = [
    'ID', 'NAME', 'DETAIL_PAGE_URL', 'DETAIL_PICTURE', 'PREVIEW_PICTURE',
    'PROPERTY_' . $categoryProp,
    'PROPERTY_' . $typesProp,
    'PROPERTY_' . $goalsProp,
    'PROPERTY_' . $activesProp,
    'PROPERTY_' . $volumeProp,
];
if ($priceProp !== '') {
    $select[] = 'PROPERTY_' . $priceProp;
}

$products = [];
$rows = CIBlockElement::GetList(['SORT' => 'ASC', 'NAME' => 'ASC'], $filter, false, ['nTopCount' => $maxItems], $select);

while ($row = $rows->GetNextElement()) {
    $fields = $row->GetFields();
    $properties = $row->GetProperties();
    $id = (int)$fields['ID'];

    $category = mapValue(firstValue($properties[$categoryProp] ?? null), $valueMaps['category'] ?? []);
    if ($category === '') {
        continue; // без категории товар не встроить в рутину
    }

    $price = resolvePrice($id, $hasCatalog, $priceProp === '' ? null : ($properties[$priceProp] ?? null));
    if ($price === null) {
        continue; // без цены карточку показывать нечем
    }

    if ($onlyInStock && $hasCatalog && !isInStock($id)) {
        continue;
    }

    $types = mapValues(allValues($properties[$typesProp] ?? null), $valueMaps['types'] ?? []);
    if (!$types) {
        continue; // товар без типов кожи не подберётся никогда
    }

    $picture = (int)($fields['DETAIL_PICTURE'] ?: $fields['PREVIEW_PICTURE']);

    $products[] = [
        'id'       => (string)$id,
        'category' => $category,
        'name'     => ['ru' => (string)$fields['NAME']],
        'price'    => $price,
        'volume'   => (string)(firstValue($properties[$volumeProp] ?? null)),
        'actives'  => array_values(array_slice(allValues($properties[$activesProp] ?? null), 0, 8)),
        'types'    => $types,
        'goals'    => mapValues(allValues($properties[$goalsProp] ?? null), $valueMaps['goals'] ?? []),
        'url'      => (string)$fields['DETAIL_PAGE_URL'],
        'image'    => $picture > 0 ? (string)CFile::GetPath($picture) : '',
    ];
}

$body = json_encode(
    ['version' => 1, 'generated_at' => date('c'), 'products' => $products],
    JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
);

if ($cacheTtl > 0) {
    writeCache($cacheFile, $body);
}

header('Cache-Control: public, max-age=' . max(0, $cacheTtl));
echo $body;
exit;

// ── Вспомогательное ─────────────────────────────────────────────────────────

/** Есть ли товар в наличии. При отключённом складском учёте считаем, что да. */
function isInStock(int $id): bool
{
    if (!class_exists('CCatalogProduct')) {
        return true;
    }
    $product = CCatalogProduct::GetByID($id);
    if (!$product) {
        return true; // не товар торгового каталога — не отсеиваем
    }
    if (($product['QUANTITY_TRACE'] ?? 'N') !== 'Y') {
        return true; // количество не отслеживается
    }
    if (($product['CAN_BUY_ZERO'] ?? 'N') === 'Y') {
        return true; // разрешена покупка при нулевом остатке
    }
    return (float)($product['QUANTITY'] ?? 0) > 0;
}

/** Атомарная запись кэша: временный файл + rename, чтобы читатель не поймал обрывок. */
function writeCache(string $file, string $body): void
{
    $dir = dirname($file);
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        return;
    }
    $tmp = $file . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, $body) !== false) {
        @rename($tmp, $file);
    }
}
