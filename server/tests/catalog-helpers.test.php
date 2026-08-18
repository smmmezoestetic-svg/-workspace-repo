<?php
require __DIR__ . '/../catalog-helpers.php';
$pass = 0; $fail = 0;
function check(string $name, $got, $want) {
    global $pass, $fail;
    if ($got === $want) { $pass++; echo "  ✓ $name\n"; }
    else { $fail++; echo "  ✗ $name\n     получили: " . json_encode($got, JSON_UNESCAPED_UNICODE)
                  . "\n     ожидали:  " . json_encode($want, JSON_UNESCAPED_UNICODE) . "\n"; }
}

$catMap = ['Сыворотка' => 'serum', 'Тонер' => 'toner'];
$typeMap = ['Жирная' => 'oily', 'Сухая' => 'dry'];

echo "preferXmlId / firstValue:\n";
check('XML_ID проставлен — берём его',
    firstValue(['VALUE_XML_ID' => 'serum', 'VALUE' => 'Сыворотка']), 'serum');
check('XML_ID пустая строка — откат на VALUE',
    firstValue(['VALUE_XML_ID' => '', 'VALUE' => 'Сыворотка']), 'Сыворотка');
check('XML_ID = false — откат на VALUE',
    firstValue(['VALUE_XML_ID' => false, 'VALUE' => 'Сыворотка']), 'Сыворотка');
check('XML_ID = null — откат на VALUE',
    firstValue(['VALUE_XML_ID' => null, 'VALUE' => 'Сыворотка']), 'Сыворотка');
check('свойство-строка без XML_ID',
    firstValue(['VALUE' => '30 мл']), '30 мл');
check('свойство отсутствует', firstValue(null), '');
check('массив пустых XML_ID — откат на VALUE',
    firstValue(['VALUE_XML_ID' => ['', ''], 'VALUE' => ['Сыворотка']]), 'Сыворотка');

echo "\nallValues:\n";
check('множественный XML_ID',
    allValues(['VALUE_XML_ID' => ['oily','dry'], 'VALUE' => ['Жирная','Сухая']]), ['oily','dry']);
check('множественный без XML_ID',
    allValues(['VALUE_XML_ID' => [false,false], 'VALUE' => ['Жирная','Сухая']]), ['Жирная','Сухая']);
check('пустые значения отбрасываются',
    allValues(['VALUE' => ['Жирная', '', '  ', 'Сухая']]), ['Жирная','Сухая']);
check('нет свойства', allValues(null), []);

echo "\nmapValue / mapValues:\n";
check('по названию', mapValue('Сыворотка', $catMap), 'serum');
check('регистр не важен', mapValue('сЫвОрОтКа', $catMap), 'serum');
check('уже внутренний ключ — пропускаем как есть', mapValue('serum', $catMap), 'serum');
check('нет в карте — отдаём как есть (виджет отсеет)', mapValue('Непонятно', $catMap), 'Непонятно');
check('пустое', mapValue('', $catMap), '');
check('множественные с дублями',
    mapValues(['Жирная','oily','Сухая'], $typeMap), ['oily','dry']);

echo "\nresolvePrice (без модуля каталога):\n";
check('цена из свойства', resolvePrice(1, false, ['VALUE' => '1890']), 1890.0);
check('цена массивом', resolvePrice(1, false, ['VALUE' => ['2450.50']]), 2450.5);
check('нечисловая цена — null', resolvePrice(1, false, ['VALUE' => 'дорого']), null);
check('нет свойства цены — null', resolvePrice(1, false, null), null);

echo "\nИтого: пройдено $pass, провалено $fail\n";
exit($fail > 0 ? 1 : 0);
