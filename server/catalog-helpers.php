<?php
/**
 * catalog-helpers.php — разбор значений свойств инфоблока.
 *
 * Вынесено из catalog.php отдельно, потому что эти функции не зависят от
 * Битрикса: их можно прогнать тестом (tests/catalog-helpers.test.php)
 * на любой машине с PHP.
 */

declare(strict_types=1);


/**
 * Для списков предпочитаем XML_ID: он не меняется при переименовании значения
 * в админке, в отличие от самого названия. Битрикс отдаёт здесь false, пустую
 * строку или массив пустых строк, когда XML_ID не проставлен, — во всех этих
 * случаях откатываемся на VALUE.
 *
 * @return string|string[]
 */
function preferXmlId(array $property)
{
    $xmlId = $property['VALUE_XML_ID'] ?? null;
    if (is_array($xmlId)) {
        $filled = array_filter($xmlId, static fn($v): bool => trim((string)$v) !== '');
        if ($filled) {
            return array_values($filled);
        }
    } elseif (trim((string)$xmlId) !== '') {
        return (string)$xmlId;
    }
    return $property['VALUE'] ?? '';
}

/** Первое значение свойства — для одиночных полей вроде объёма и категории. */
function firstValue(?array $property): string
{
    if ($property === null) {
        return '';
    }
    $source = preferXmlId($property);
    if (is_array($source)) {
        $source = reset($source);
    }
    return trim((string)$source);
}

/** @return string[] Все значения множественного свойства. */
function allValues(?array $property): array
{
    if ($property === null) {
        return [];
    }
    $source = preferXmlId($property);
    if (!is_array($source)) {
        $source = [$source];
    }
    $out = [];
    foreach ($source as $value) {
        $value = trim((string)$value);
        if ($value !== '') {
            $out[] = $value;
        }
    }
    return $out;
}

/**
 * Переводит значение из админки во внутренний ключ теста. Позволяет назвать
 * значения списка по-русски: если XML_ID не проставлен, сработает карта по
 * названию. Сравнение регистронезависимое.
 */
function mapValue(string $value, array $map): string
{
    if ($value === '') {
        return '';
    }
    $lower = mb_strtolower($value);
    foreach ($map as $from => $to) {
        if (mb_strtolower((string)$from) === $lower) {
            return (string)$to;
        }
    }
    // Значение уже записано внутренним ключом — отдаём как есть,
    // виджет всё равно проверит его по своему списку допустимых.
    return $value;
}

/** @return string[] */
function mapValues(array $values, array $map): array
{
    $out = [];
    foreach ($values as $value) {
        $mapped = mapValue($value, $map);
        if ($mapped !== '' && !in_array($mapped, $out, true)) {
            $out[] = $mapped;
        }
    }
    return $out;
}

/**
 * Базовая цена товара; null — если цену определить не удалось.
 * $priceProperty — свойство с ценой из основной выборки, для магазинов
 * без модуля «Торговый каталог».
 */
function resolvePrice(int $id, bool $hasCatalog, ?array $priceProperty): ?float
{
    if ($hasCatalog && class_exists('CPrice')) {
        $price = CPrice::GetBasePrice($id);
        if ($price && isset($price['PRICE'])) {
            return round((float)$price['PRICE'], 2);
        }
    }

    if ($priceProperty !== null) {
        $value = $priceProperty['VALUE'] ?? null;
        if (is_array($value)) {
            $value = reset($value);
        }
        if (is_numeric($value)) {
            return round((float)$value, 2);
        }
    }

    return null;
}
