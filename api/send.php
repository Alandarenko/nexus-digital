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
$TOKEN = $env['TG_BOT_TOKEN'] ?? '';
$CHAT_ID = $env['TG_CHAT_ID'] ?? '';

// Rate limiting (file-based, 5 req/min per IP)
$ip = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '')[0] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$ip = trim($ip);
$rateDir = __DIR__ . '/../.ratelimit';
if (!is_dir($rateDir)) mkdir($rateDir, 0700, true);
$rateFile = $rateDir . '/' . md5('send_' . $ip) . '.json';

$now = time();
if (file_exists($rateFile)) {
    $rateData = json_decode(file_get_contents($rateFile), true);
    if ($now - $rateData['start'] > 60) {
        $rateData = ['start' => $now, 'count' => 1];
    } else {
        $rateData['count']++;
    }
} else {
    $rateData = ['start' => $now, 'count' => 1];
}
file_put_contents($rateFile, json_encode($rateData), LOCK_EX);

if ($rateData['count'] > 5) {
    http_response_code(429);
    echo json_encode(['error' => 'Too many requests. Try again later.']);
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
$text = $input['text'] ?? '';
$fields = $input['fields'] ?? null;

if (!$text || !is_string($text)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing text']);
    exit;
}
if (mb_strlen($text) > 10000) {
    http_response_code(400);
    echo json_encode(['error' => 'Text too long']);
    exit;
}

// Sanitize helper
function sanitize($v, $max = 500) {
    if (!$v || !is_string($v)) return '—';
    return strip_tags(mb_substr($v, 0, $max));
}

// Send text message to Telegram
$ch = curl_init("https://api.telegram.org/bot{$TOKEN}/sendMessage");
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode([
        'chat_id' => $CHAT_ID,
        'text' => mb_substr($text, 0, 10000),
        'parse_mode' => 'Markdown'
    ]),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 15,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json']
]);
$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);
if (!($data['ok'] ?? false)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $data['description'] ?? 'Telegram error']);
    exit;
}

// Send .md file if fields provided
if ($fields && is_array($fields)) {
    $dash = function($v, $max = 500) { return sanitize($v, $max) ?: '—'; };

    $date = date('Y-m-d');
    $md = "# Бриф — {$dash($fields['name'] ?? '', 100)}\n\n";
    $md .= "## Контакты\n";
    $md .= "- **Имя:** {$dash($fields['name'] ?? '', 100)}\n";
    $md .= "- **Телефон:** {$dash($fields['phone'] ?? '', 30)}\n";
    $md .= "- **Email:** {$dash($fields['email'] ?? '', 100)}\n";
    $md .= "- **Telegram:** {$dash($fields['tg'] ?? '', 100)}\n\n";
    $md .= "## Проект\n";
    $md .= "- **Тип:** {$dash($fields['type'] ?? '', 200)}\n";
    $md .= "- **Бюджет:** {$dash($fields['budget'] ?? '', 100)}\n";
    $md .= "- **Сроки:** {$dash($fields['timeline'] ?? '', 100)}\n\n";
    $md .= "## Задача\n{$dash($fields['desc'] ?? '', 5000)}\n\n";
    $md .= "## Комментарии\n{$dash($fields['comments'] ?? '', 5000)}\n";

    $name = sanitize($fields['name'] ?? '', 100);
    $slug = '';
    if ($name && $name !== '—') {
        $slug = '-' . preg_replace('/\s+/u', '-', preg_replace('/[^a-zA-Zа-яА-ЯёЁ0-9\s\-]/u', '', trim($name)));
    }
    $filename = "brief-{$date}{$slug}.md";

    // Write temp file
    $tmpFile = tempnam(sys_get_temp_dir(), 'brief_');
    file_put_contents($tmpFile, $md);

    $ch = curl_init("https://api.telegram.org/bot{$TOKEN}/sendDocument");
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => [
            'chat_id' => $CHAT_ID,
            'document' => new CURLFile($tmpFile, 'text/markdown', $filename)
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15
    ]);
    curl_exec($ch);
    curl_close($ch);
    unlink($tmpFile);
}

echo json_encode(['ok' => true]);
