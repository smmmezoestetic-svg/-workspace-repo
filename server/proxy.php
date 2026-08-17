<?php
/**
 * proxy.php — серверная прослойка между виджетом и Anthropic API.
 *
 * Ключ никогда не покидает сервер. Браузер шлёт сюда только массив messages,
 * модель и лимит токенов задаются здесь, поэтому подобранный чужими руками
 * запрос не сможет ни сменить модель, ни выкрутить max_tokens.
 *
 * Установка: положить в /skin-test-app/api/proxy.php, а config.php —
 * рядом либо (лучше) выше корня сайта, см. config.sample.php.
 */

declare(strict_types=1);

// ── Конфигурация ────────────────────────────────────────────────────────────
$configCandidates = [
    __DIR__ . '/../../skin-test-config.php', // выше корня сайта — предпочтительно
    __DIR__ . '/config.php',
];
$config = [];
foreach ($configCandidates as $path) {
    if (is_readable($path)) {
        $config = require $path;
        break;
    }
}

$apiKey = $config['api_key'] ?? getenv('ANTHROPIC_API_KEY') ?: '';
$allowedOrigins = $config['allowed_origins'] ?? ['https://mesoforia.ru', 'https://www.mesoforia.ru'];
$model = $config['model'] ?? 'claude-haiku-4-5-20251001';
$maxTokens = (int)($config['max_tokens'] ?? 1024);
$rateLimitPerHour = (int)($config['rate_limit_per_hour'] ?? 60);
$rateLimitDir = $config['rate_limit_dir'] ?? sys_get_temp_dir() . '/mesoforia-skin-test';
$maxBodyBytes = (int)($config['max_body_bytes'] ?? 8 * 1024 * 1024); // фото в base64

// ── CORS ────────────────────────────────────────────────────────────────────
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
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
    fail(405, 'Метод не поддерживается');
}

// Запрос с чужого сайта отсекаем: браузер всегда шлёт Origin для
// cross-origin POST, а запрос со своей же страницы приходит без него.
if ($origin !== '' && !in_array($origin, $allowedOrigins, true)) {
    fail(403, 'Origin не разрешён');
}

if ($apiKey === '') {
    fail(500, 'Ключ API не настроен на сервере');
}

// ── Лимит частоты ───────────────────────────────────────────────────────────
if ($rateLimitPerHour > 0 && !allowRequest($rateLimitDir, clientIp(), $rateLimitPerHour)) {
    fail(429, 'Слишком много запросов, попробуйте через несколько минут');
}

// ── Разбор и валидация тела ─────────────────────────────────────────────────
$raw = file_get_contents('php://input');
if ($raw === false || $raw === '') {
    fail(400, 'Пустой запрос');
}
if (strlen($raw) > $maxBodyBytes) {
    fail(413, 'Фото слишком большое');
}

$input = json_decode($raw, true);
if (!is_array($input) || !isset($input['messages']) || !is_array($input['messages'])) {
    fail(400, 'Ожидается поле messages');
}

$messages = sanitizeMessages($input['messages']);
if ($messages === null) {
    fail(400, 'Некорректный формат messages');
}

// ── Запрос к Anthropic ──────────────────────────────────────────────────────
$payload = json_encode([
    'model'      => $model,
    'max_tokens' => $maxTokens,
    'messages'   => $messages,
], JSON_UNESCAPED_UNICODE);

$ch = curl_init('https://api.anthropic.com/v1/messages');
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 60,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_HTTPHEADER     => [
        'x-api-key: ' . $apiKey,
        'anthropic-version: 2023-06-01',
        'content-type: application/json',
    ],
]);

$response = curl_exec($ch);
$status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($response === false) {
    error_log('[skin-test] curl: ' . $curlError);
    fail(502, 'Сервис анализа временно недоступен');
}

if ($status < 200 || $status >= 300) {
    // Текст ошибки Anthropic может содержать детали ключа и биллинга —
    // наружу отдаём общую формулировку, подробности в лог сервера.
    error_log('[skin-test] anthropic ' . $status . ': ' . substr($response, 0, 500));
    fail($status === 429 ? 429 : 502, 'Сервис анализа временно недоступен');
}

// Отдаём ответ как есть — виджет читает content[0].text.
echo $response;
exit;

// ── Вспомогательное ─────────────────────────────────────────────────────────

function fail(int $code, string $message): void
{
    http_response_code($code);
    echo json_encode(['error' => ['message' => $message]], JSON_UNESCAPED_UNICODE);
    exit;
}

function clientIp(): string
{
    // Битрикс за nginx/CDN: реальный адрес приходит в X-Forwarded-For.
    $forwarded = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
    if ($forwarded !== '') {
        $first = trim(explode(',', $forwarded)[0]);
        if (filter_var($first, FILTER_VALIDATE_IP)) {
            return $first;
        }
    }
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

/**
 * Счётчик запросов на IP в скользящем часовом окне. Файл на IP, внутри —
 * метки времени; блокировка на запись защищает от гонки параллельных запросов.
 */
function allowRequest(string $dir, string $ip, int $limit): bool
{
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        return true; // не смогли создать хранилище — не блокируем пользователей
    }

    $file = $dir . '/' . hash('sha256', $ip) . '.txt';
    $handle = @fopen($file, 'c+');
    if ($handle === false) {
        return true;
    }

    $allowed = true;
    if (flock($handle, LOCK_EX)) {
        $contents = stream_get_contents($handle) ?: '';
        $cutoff = time() - 3600;
        $stamps = array_values(array_filter(
            array_map('intval', array_filter(explode("\n", $contents), 'strlen')),
            static fn(int $ts): bool => $ts > $cutoff
        ));

        if (count($stamps) >= $limit) {
            $allowed = false;
        } else {
            $stamps[] = time();
        }

        ftruncate($handle, 0);
        rewind($handle);
        fwrite($handle, implode("\n", $stamps));
        fflush($handle);
        flock($handle, LOCK_UN);
    }
    fclose($handle);

    return $allowed;
}

/**
 * Пропускаем только ту форму сообщений, которую шлёт виджет: роли user и
 * assistant, блоки text и image с base64-картинкой поддерживаемого типа.
 * Возвращает null, если структура не подходит.
 */
function sanitizeMessages(array $messages): ?array
{
    if ($messages === [] || count($messages) > 10) {
        return null;
    }

    $allowedMedia = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    $clean = [];

    foreach ($messages as $message) {
        if (!is_array($message)) {
            return null;
        }
        $role = $message['role'] ?? '';
        if ($role !== 'user' && $role !== 'assistant') {
            return null;
        }
        $content = $message['content'] ?? null;

        if (is_string($content)) {
            $clean[] = ['role' => $role, 'content' => $content];
            continue;
        }
        if (!is_array($content) || $content === [] || count($content) > 8) {
            return null;
        }

        $blocks = [];
        foreach ($content as $block) {
            if (!is_array($block)) {
                return null;
            }
            $type = $block['type'] ?? '';

            if ($type === 'text') {
                if (!isset($block['text']) || !is_string($block['text'])) {
                    return null;
                }
                $blocks[] = ['type' => 'text', 'text' => $block['text']];
                continue;
            }

            if ($type === 'image') {
                $source = $block['source'] ?? null;
                if (!is_array($source) || ($source['type'] ?? '') !== 'base64') {
                    return null;
                }
                $mediaType = $source['media_type'] ?? '';
                $data = $source['data'] ?? '';
                if (!in_array($mediaType, $allowedMedia, true) || !is_string($data) || $data === '') {
                    return null;
                }
                if (base64_decode($data, true) === false) {
                    return null;
                }
                $blocks[] = [
                    'type'   => 'image',
                    'source' => ['type' => 'base64', 'media_type' => $mediaType, 'data' => $data],
                ];
                continue;
            }

            return null;
        }

        $clean[] = ['role' => $role, 'content' => $blocks];
    }

    return $clean;
}
