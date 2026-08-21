<?php
/**
 * add-to-cart.php — кладёт отобранные тестом средства в корзину сайта.
 *
 * Виджет присылает список ID товаров, эндпоинт добавляет их в корзину
 * текущего посетителя и отвечает, сколько позиций удалось положить.
 * Запрос идёт со страницы того же домена, поэтому сессионная кука магазина
 * прикладывается браузером сама и товары попадают именно в его корзину.
 *
 * Установка: положить рядом с catalog.php, в /skin-test-app/api/.
 * Настройки берутся из того же catalog-config.php.
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
$flagProp       = $config['properties']['flag'] ?? 'USE_IN_SKIN_TEST';
$cartPageUrl    = $config['cart_page_url'] ?? '/personal/cart/';
$maxItems       = (int)($config['cart_max_items'] ?? 20);

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
}
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 86400');
    http_response_code(204);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    cartFail(405, 'Метод не поддерживается');
}

// Корзина принадлежит посетителю, поэтому запрос со стороннего сайта
// сюда пускать незачем.
if ($origin !== '' && !in_array($origin, $allowedOrigins, true)) {
    cartFail(403, 'Origin не разрешён');
}

if ($iblockId <= 0) {
    cartFail(500, 'Не задан iblock_id в настройках каталога');
}

$raw = file_get_contents('php://input');
$input = json_decode((string)$raw, true);
$ids = sanitizeIds($input['ids'] ?? null, $maxItems);
if ($ids === []) {
    cartFail(400, 'Не передан список товаров');
}

// ── Загрузка Битрикса ───────────────────────────────────────────────────────
define('NO_KEEP_STATISTIC', true);
define('NO_AGENT_CHECK', true);

$prolog = ($_SERVER['DOCUMENT_ROOT'] ?? '') . '/bitrix/modules/main/include/prolog_before.php';
if (!is_readable($prolog)) {
    $prolog = __DIR__ . '/../../bitrix/modules/main/include/prolog_before.php';
}
if (!is_readable($prolog)) {
    cartFail(500, 'Не найдено ядро Битрикса');
}
require_once $prolog;

if (!CModule::IncludeModule('iblock') || !CModule::IncludeModule('catalog') || !CModule::IncludeModule('sale')) {
    cartFail(500, 'Не подключены модули iblock, catalog и sale');
}

// ── Что вообще разрешено класть ─────────────────────────────────────────────
// Только активные товары нужного инфоблока с проставленной галочкой
// «участвует в тесте» — чтобы эндпоинт не превратился в способ добавить
// в корзину что угодно по чужой наводке.
$allowed = [];
$rows = CIBlockElement::GetList(
    [],
    [
        'IBLOCK_ID'              => $iblockId,
        'ACTIVE'                 => 'Y',
        'ID'                     => $ids,
        '!PROPERTY_' . $flagProp => false,
    ],
    false,
    false,
    ['ID']
);
while ($row = $rows->Fetch()) {
    $allowed[(int)$row['ID']] = true;
}

// ── Добавление ──────────────────────────────────────────────────────────────
$added = 0;
$skipped = [];

foreach ($ids as $id) {
    $id = (int)$id;
    if (!isset($allowed[$id])) {
        $skipped[] = ['id' => $id, 'reason' => 'not-allowed'];
        continue;
    }

    $buyableId = resolveBuyableId($id);
    if ($buyableId === null) {
        $skipped[] = ['id' => $id, 'reason' => 'no-offer'];
        continue;
    }

    if (addToBasket($buyableId)) {
        $added++;
    } else {
        $skipped[] = ['id' => $id, 'reason' => 'add-failed'];
    }
}

echo json_encode([
    'ok'      => true,
    'added'   => $added,
    'skipped' => $skipped,
    'cartUrl' => $cartPageUrl,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
exit;

// ── Вспомогательное ─────────────────────────────────────────────────────────

function cartFail(int $code, string $message): void
{
    http_response_code($code);
    echo json_encode(['error' => ['message' => $message]], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Что именно класть в корзину. У товара с торговыми предложениями покупается
 * не сам товар, а предложение, поэтому берём первое активное. Если у магазина
 * другое правило выбора (по цене, по остатку) — менять здесь.
 */
function resolveBuyableId(int $id): ?int
{
    if (!class_exists('CCatalogSKU')) {
        return $id;
    }
    $offers = CCatalogSKU::getOffersList([$id], 0, ['ACTIVE' => 'Y'], ['ID']);
    if (empty($offers[$id])) {
        return $id; // простой товар без предложений
    }
    $first = array_key_first($offers[$id]);
    return $first === null ? null : (int)$first;
}

function addToBasket(int $productId): bool
{
    if (class_exists('\Bitrix\Catalog\Product\Basket')) {
        try {
            $result = \Bitrix\Catalog\Product\Basket::addProduct([
                'PRODUCT_ID' => $productId,
                'QUANTITY'   => 1,
            ]);
            if ($result->isSuccess()) {
                return true;
            }
            error_log('[skin-test cart] ' . $productId . ': ' . implode('; ', $result->getErrorMessages()));
        } catch (\Throwable $e) {
            error_log('[skin-test cart] ' . $productId . ': ' . $e->getMessage());
        }
        return false;
    }

    // Магазины на старом ядре.
    if (class_exists('CSaleBasket')) {
        return (bool)CSaleBasket::Add2BasketByProductID($productId, 1, [], []);
    }

    return false;
}
