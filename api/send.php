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

// For full brief, generate text from fields (no text sent from client)
$briefType = ($fields && is_array($fields)) ? ($fields['brief_type'] ?? 'short') : 'short';
if ($briefType === 'full' && $fields && !$text) {
    $text = "\xF0\x9F\x93\x8B *Полный бриф с сайта Devorra*\n\n";
    $text .= "\xF0\x9F\x91\xA4 " . sanitize($fields['name'] ?? '', 100) . "\n";
    $text .= "\xF0\x9F\x8F\xA2 " . sanitize($fields['company'] ?? '', 100) . "\n";
    $text .= "\xF0\x9F\x93\x9E " . sanitize($fields['phone'] ?? '', 30) . "\n";
    $text .= "\xF0\x9F\x93\xA7 " . sanitize($fields['email'] ?? '', 100) . "\n";
    if (!empty($fields['telegram'])) $text .= "TG: " . sanitize($fields['telegram'], 100) . "\n";
    $text .= "\n\xF0\x9F\x94\xA7 " . sanitize($fields['site_type'] ?? '', 200) . "\n";
    $text .= "\xF0\x9F\x92\xB3 " . sanitize($fields['budget'] ?? '', 100) . "\n";
    $text .= "\xE2\x8F\xB0 " . sanitize($fields['timeline'] ?? '', 100) . "\n";
    $text .= "\n_Подробности в .md файле_";
}

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
    $arrJoin = function($v) {
        if (is_array($v)) return implode(', ', array_map('sanitize', $v)) ?: '—';
        return sanitize($v) ?: '—';
    };

    $date = date('Y-m-d');

    if ($briefType === 'full') {
        // Full brief: 8 sections
        $md = "# Полный бриф — {$dash($fields['name'] ?? '', 100)}\n";
        $md .= "_Дата: {$date}_\n\n";

        // 1. Contacts
        $md .= "## 1. Контактная информация\n";
        $md .= "- **Имя:** {$dash($fields['name'] ?? '', 100)}\n";
        $md .= "- **Компания:** {$dash($fields['company'] ?? '', 200)}\n";
        $md .= "- **Должность:** {$dash($fields['position'] ?? '', 100)}\n";
        $md .= "- **Телефон:** {$dash($fields['phone'] ?? '', 30)}\n";
        $md .= "- **Email:** {$dash($fields['email'] ?? '', 100)}\n";
        $md .= "- **Telegram:** {$dash($fields['telegram'] ?? '', 100)}\n";
        $md .= "- **ЛПР:** {$dash($fields['decision_maker'] ?? '', 200)}\n\n";

        // 2. Business
        $md .= "## 2. О бизнесе\n";
        $md .= "- **Деятельность:** {$dash($fields['business_desc'] ?? '', 5000)}\n";
        $md .= "- **Сфера:** {$dash($fields['industry'] ?? '', 200)}\n";
        $md .= "- **Лет на рынке:** {$dash($fields['years'] ?? '', 100)}\n";
        $md .= "- **География:** {$arrJoin($fields['geo'] ?? '')}\n";
        $md .= "- **УТП:** {$dash($fields['utp'] ?? '', 5000)}\n";
        $md .= "- **Конкуренты:** {$arrJoin($fields['competitorUrls'] ?? '')}\n";
        $md .= "- **Текущий сайт:** {$dash($fields['current_site'] ?? '', 500)}\n";
        $md .= "- **Проблемы:** {$arrJoin($fields['problems'] ?? '')}\n\n";

        // 3. Audience
        $md .= "## 3. Целевая аудитория\n";
        $md .= "- **Тип клиентов:** {$dash($fields['client_type'] ?? '', 200)}\n";
        $md .= "- **Возраст:** {$arrJoin($fields['age'] ?? '')}\n";
        $md .= "- **Доход:** {$dash($fields['income'] ?? '', 200)}\n";
        $md .= "- **Источники трафика:** {$arrJoin($fields['source'] ?? '')}\n";
        $md .= "- **Устройства:** {$dash($fields['device'] ?? '', 200)}\n";
        $md .= "- **Боли клиентов:** {$dash($fields['pains'] ?? '', 5000)}\n\n";

        // 4. Goals
        $md .= "## 4. Цели и задачи\n";
        $md .= "- **Главная цель:** {$dash($fields['main_goal'] ?? '', 200)}\n";
        $md .= "- **Целевое действие:** {$arrJoin($fields['action'] ?? '')}\n";
        $md .= "- **Заявок/мес:** {$dash($fields['target_leads'] ?? '', 200)}\n";
        $md .= "- **Средний чек:** {$dash($fields['avg_check'] ?? '', 200)}\n";
        $md .= "- **Продвижение:** {$arrJoin($fields['promo'] ?? '')}\n\n";

        // 5. Functionality
        $md .= "## 5. Функциональность\n";
        $md .= "- **Тип проекта:** {$dash($fields['site_type'] ?? '', 200)}\n";
        $md .= "- **Разделы:** {$arrJoin($fields['sections'] ?? '')}\n";
        $md .= "- **Функции:** {$arrJoin($fields['features'] ?? '')}\n";
        $md .= "- **Интеграции:** {$arrJoin($fields['integrations'] ?? '')}\n";
        $md .= "- **Размер каталога:** {$dash($fields['catalog_size'] ?? '', 100)}\n";
        $md .= "- **CMS:** {$dash($fields['cms'] ?? '', 200)}\n\n";

        // 6. Design
        $md .= "## 6. Дизайн\n";
        $md .= "- **Фирменный стиль:** {$dash($fields['brand'] ?? '', 200)}\n";
        $md .= "- **Стиль дизайна:** {$dash($fields['style'] ?? '', 200)}\n";
        $md .= "- **Нравятся:** {$arrJoin($fields['likeUrls'] ?? '')}\n";
        $md .= "- **Почему нравятся:** {$dash($fields['like_why'] ?? '', 5000)}\n";
        $md .= "- **Не нравятся:** {$arrJoin($fields['dislikeUrls'] ?? '')}\n";
        $md .= "- **Почему не нравятся:** {$dash($fields['dislike_why'] ?? '', 5000)}\n\n";

        // 7. Content
        $md .= "## 7. Контент\n";
        $md .= "- **Тексты:** {$dash($fields['texts'] ?? '', 200)}\n";
        $md .= "- **Готовые материалы:** {$arrJoin($fields['materials'] ?? '')}\n";
        $md .= "- **Обновление сайта:** {$dash($fields['updater'] ?? '', 200)}\n";
        $md .= "- **Фотосъёмка:** {$dash($fields['photoshoot'] ?? '', 200)}\n\n";

        // 8. Budget
        $md .= "## 8. Бюджет и сроки\n";
        $md .= "- **Бюджет:** {$dash($fields['budget'] ?? '', 200)}\n";
        $md .= "- **Сроки:** {$dash($fields['timeline'] ?? '', 200)}\n";
        $md .= "- **Дедлайн:** {$dash($fields['deadline'] ?? '', 500)}\n";
        $md .= "- **Оплата:** {$dash($fields['payment'] ?? '', 200)}\n";
        $md .= "- **Поддержка:** {$dash($fields['support'] ?? '', 200)}\n";
        $md .= "- **Комментарии:** {$dash($fields['comments'] ?? '', 5000)}\n";
    } elseif ($briefType === 'audit') {
        // Audit request
        $md = "# Заявка на аудит — {$dash($fields['name'] ?? '', 100)}\n";
        $md .= "_Дата: {$date}_\n\n";
        $md .= "## Сайт\n";
        $md .= "- **URL:** {$dash($fields['url'] ?? '', 500)}\n\n";
        $md .= "## Контакт\n";
        $md .= "- **Имя:** {$dash($fields['name'] ?? '', 100)}\n";
        $md .= "- **Telegram/Телефон:** {$dash($fields['contact'] ?? '', 100)}\n\n";
        $md .= "## Комментарий\n{$dash($fields['comment'] ?? '', 1000)}\n";
    } else {
        // Short brief (from modal)
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
    }

    $name = sanitize($fields['name'] ?? '', 100);
    $slug = '';
    if ($name && $name !== '—') {
        $slug = '-' . preg_replace('/\s+/u', '-', preg_replace('/[^a-zA-Zа-яА-ЯёЁ0-9\s\-]/u', '', trim($name)));
    }
    if ($briefType === 'audit') {
        $prefix = 'audit';
    } elseif ($briefType === 'full') {
        $prefix = 'full-brief';
    } else {
        $prefix = 'brief';
    }
    $filename = "{$prefix}-{$date}{$slug}.md";

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
