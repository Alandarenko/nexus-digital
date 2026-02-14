// In-memory rate limiter (resets on cold start)
const rateMap = new Map();
const RATE_LIMIT = 20;
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function checkRate(ip) {
    const now = Date.now();
    const entry = rateMap.get(ip);
    if (!entry || now - entry.start > RATE_WINDOW) {
        rateMap.set(ip, { start: now, count: 1 });
        return { allowed: true, remaining: RATE_LIMIT - 1 };
    }
    entry.count++;
    return { allowed: entry.count <= RATE_LIMIT, remaining: Math.max(0, RATE_LIMIT - entry.count) };
}

const SYSTEM_PROMPT = `Ты — AI-консультант веб-студии Devorra. Отвечай коротко (2-3 предложения), по делу, дружелюбно. Используй «вы».

Услуги и цены:
- Лендинг: от 40 000 ₽, 2-3 недели
- Корпоративный сайт: от 80 000 ₽, 3-5 недель
- Интернет-магазин: от 150 000 ₽, 5-8 недель
- SEO-продвижение: от 30 000 ₽/мес
- AI-интеграции (чат-боты, автоматизация): от 25 000 ₽
- Импортозамещение (миграция с WordPress на 1С-Битрикс, с AWS на Yandex Cloud): от 50 000 ₽
- Техподдержка: от 15 000 ₽/мес

Стек: Next.js, React, Node.js, 1С-Битрикс, YandexGPT, Yandex Cloud, Vercel.

Контакты:
- Telegram: @myway_nikita
- Email: nikita.alandarenko@gmail.com
- Сайт: devorra.ru

Если вопрос сложный или клиент хочет обсудить проект — предложи оставить заявку на сайте или написать в Telegram @myway_nikita.
Не отвечай на вопросы, не связанные с веб-разработкой, дизайном, SEO, AI или услугами Devorra — вежливо перенаправь к теме.`;

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    // Rate limiting
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
    const rate = checkRate(ip);
    if (!rate.allowed) {
        return res.status(429).json({ ok: false, limited: true, remaining: 0 });
    }

    // CSRF: check Origin header
    const origin = req.headers.origin || req.headers.referer || '';
    const allowed = process.env.ALLOWED_ORIGIN || 'https://nexus-digital-lovat.vercel.app';
    try { var o = new URL(origin); } catch (e) { return res.status(403).json({ error: 'Forbidden' }); }
    if (o.origin !== allowed && !origin.startsWith('http://localhost')) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const { message, history } = req.body;
    if (!message || typeof message !== 'string' || message.length > 1000) {
        return res.status(400).json({ error: 'Invalid message' });
    }

    // Build messages array
    const messages = [{ role: 'system', text: SYSTEM_PROMPT }];

    if (Array.isArray(history)) {
        for (const msg of history.slice(-8)) {
            if (msg.role === 'user' || msg.role === 'assistant') {
                messages.push({ role: msg.role, text: String(msg.text).slice(0, 1000) });
            }
        }
    }
    messages.push({ role: 'user', text: message });

    const FOLDER_ID = process.env.YANDEX_FOLDER_ID;
    const API_KEY = process.env.YANDEX_API_KEY;

    if (!FOLDER_ID || !API_KEY) {
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        const response = await fetch('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Api-Key ${API_KEY}`,
                'x-folder-id': FOLDER_ID
            },
            body: JSON.stringify({
                modelUri: `gpt://${FOLDER_ID}/yandexgpt-lite/latest`,
                completionOptions: {
                    stream: false,
                    temperature: 0.3,
                    maxTokens: 300
                },
                messages
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('YandexGPT error:', response.status, errText);
            return res.status(502).json({ ok: false, error: 'AI service error' });
        }

        const data = await response.json();
        const reply = data.result?.alternatives?.[0]?.message?.text || 'Извините, не удалось сформировать ответ.';

        return res.status(200).json({ ok: true, reply, remaining: rate.remaining });
    } catch (err) {
        console.error('Chat API error:', err);
        return res.status(500).json({ ok: false, error: 'Internal error' });
    }
}
