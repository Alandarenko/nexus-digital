<?php
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Load env
$env = parse_ini_file(__DIR__ . '/../.env');
if (!$env) {
    http_response_code(500);
    echo json_encode(['error' => 'Server configuration error']);
    exit;
}

$ALLOWED_ORIGIN = $env['ALLOWED_ORIGIN'] ?? 'https://devorra.ru';
$FOLDER_ID = $env['YANDEX_FOLDER_ID'] ?? '';
$API_KEY = $env['YANDEX_API_KEY'] ?? '';

if (!$FOLDER_ID || !$API_KEY) {
    http_response_code(500);
    echo json_encode(['error' => 'Server configuration error']);
    exit;
}

// Rate limiting (file-based, 20 req/hour per IP)
$ip = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '')[0] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$ip = trim($ip);
$rateDir = __DIR__ . '/../.ratelimit';
if (!is_dir($rateDir)) mkdir($rateDir, 0700, true);
$rateFile = $rateDir . '/' . md5('chat_' . $ip) . '.json';

$rateLimit = 20;
$rateWindow = 3600;
$now = time();
$remaining = $rateLimit - 1;

if (file_exists($rateFile)) {
    $rateData = json_decode(file_get_contents($rateFile), true);
    if ($now - $rateData['start'] > $rateWindow) {
        $rateData = ['start' => $now, 'count' => 1];
    } else {
        $rateData['count']++;
    }
} else {
    $rateData = ['start' => $now, 'count' => 1];
}
file_put_contents($rateFile, json_encode($rateData), LOCK_EX);
$remaining = max(0, $rateLimit - $rateData['count']);

if ($rateData['count'] > $rateLimit) {
    http_response_code(429);
    echo json_encode(['ok' => false, 'limited' => true, 'remaining' => 0]);
    exit;
}

// CSRF check
$origin = $_SERVER['HTTP_ORIGIN'] ?? $_SERVER['HTTP_REFERER'] ?? '';
$parsed = parse_url($origin);
$originHost = ($parsed['scheme'] ?? '') . '://' . ($parsed['host'] ?? '');
if ($originHost !== $ALLOWED_ORIGIN && strpos($origin, 'http://localhost') !== 0) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden']);
    exit;
}

// Parse input
$input = json_decode(file_get_contents('php://input'), true);
$message = $input['message'] ?? '';
$history = $input['history'] ?? [];

if (!$message || !is_string($message) || mb_strlen($message) > 1000) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid message']);
    exit;
}

// System prompt
$systemPrompt = 'Ты — AI-консультант веб-студии Devorra. Отвечай коротко (2-3 предложения), по делу, дружелюбно. Используй «вы».

Услуги и цены:
- Лендинг: от 40 000 ₽, 2-3 недели
- Корпоративный сайт: от 100 000 ₽, 3-5 недель
- Интернет-магазин: от 150 000 ₽, 5-8 недель
- SEO-продвижение: от 20 000 ₽/мес
- AI-интеграции (чат-боты, автоматизация): от 25 000 ₽
- Импортозамещение (миграция с WordPress на 1С-Битрикс, с AWS на Yandex Cloud): от 50 000 ₽
- Техподдержка: от 5 000 ₽/мес

Стек: Next.js, React, Node.js, 1С-Битрикс, YandexGPT, Yandex Cloud.

Контакты:
- Telegram: @myway_nikita
- Email: nikita.alandarenko@gmail.com
- Сайт: devorra.ru

Если вопрос сложный или клиент хочет обсудить проект — предложи оставить заявку на сайте или написать в Telegram @myway_nikita.
Не отвечай на вопросы, не связанные с веб-разработкой, дизайном, SEO, AI или услугами Devorra — вежливо перенаправь к теме.';

// Build messages
$messages = [['role' => 'system', 'text' => $systemPrompt]];

if (is_array($history)) {
    $history = array_slice($history, -8);
    foreach ($history as $msg) {
        if (isset($msg['role'], $msg['text']) && in_array($msg['role'], ['user', 'assistant'])) {
            $messages[] = ['role' => $msg['role'], 'text' => mb_substr((string)$msg['text'], 0, 1000)];
        }
    }
}
$messages[] = ['role' => 'user', 'text' => $message];

// Call YandexGPT
$payload = json_encode([
    'modelUri' => "gpt://{$FOLDER_ID}/yandexgpt-lite/latest",
    'completionOptions' => [
        'stream' => false,
        'temperature' => 0.3,
        'maxTokens' => 300
    ],
    'messages' => $messages
]);

$ch = curl_init('https://llm.api.cloud.yandex.net/foundationModels/v1/completion');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        "Authorization: Api-Key {$API_KEY}",
        "x-folder-id: {$FOLDER_ID}"
    ]
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200) {
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => 'AI service error']);
    exit;
}

$data = json_decode($response, true);
$reply = $data['result']['alternatives'][0]['message']['text'] ?? 'Извините, не удалось сформировать ответ.';

echo json_encode(['ok' => true, 'reply' => $reply, 'remaining' => $remaining]);
