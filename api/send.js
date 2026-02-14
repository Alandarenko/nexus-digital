// Simple in-memory rate limiter (resets on cold start)
const rateMap = new Map();
const RATE_LIMIT = 5;
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRate(ip) {
    const now = Date.now();
    const entry = rateMap.get(ip);
    if (!entry || now - entry.start > RATE_WINDOW) {
        rateMap.set(ip, { start: now, count: 1 });
        return true;
    }
    entry.count++;
    return entry.count <= RATE_LIMIT;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    // Rate limiting
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
    if (!checkRate(ip)) {
        return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }

    // CSRF: check Origin header
    const origin = req.headers.origin || req.headers.referer || '';
    const allowed = process.env.ALLOWED_ORIGIN || 'https://nexus-digital-lovat.vercel.app';
    try { var o = new URL(origin); } catch(e) { return res.status(403).json({ error: 'Forbidden' }); }
    if (o.origin !== allowed && !origin.startsWith('http://localhost')) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const { text, fields } = req.body;
    if (!text) return res.status(400).json({ error: 'Missing text' });

    // Validate text length
    if (typeof text !== 'string' || text.length > 10000) {
        return res.status(400).json({ error: 'Text too long' });
    }

    // Sanitize and validate fields
    const sanitize = (v, max = 500) => {
        if (!v || typeof v !== 'string') return '—';
        return v.slice(0, max).replace(/<[^>]*>/g, '');
    };

    const TOKEN = process.env.TG_BOT_TOKEN;
    const CHAT_ID = process.env.TG_CHAT_ID;

    // Send text message
    const tgRes = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT_ID, text: text.slice(0, 10000), parse_mode: 'Markdown' })
    });
    const data = await tgRes.json();
    if (!data.ok) return res.status(500).json({ ok: false, error: data.description });

    // Send .md file if fields are provided
    if (fields && typeof fields === 'object') {
        const d = new Date();
        const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const dash = (v, max) => sanitize(v, max) || '—';

        let md = `# Бриф — ${dash(fields.name, 100)}\n\n`;
        md += `## Контакты\n`;
        md += `- **Имя:** ${dash(fields.name, 100)}\n`;
        md += `- **Телефон:** ${dash(fields.phone, 30)}\n`;
        md += `- **Email:** ${dash(fields.email, 100)}\n`;
        md += `- **Telegram:** ${dash(fields.tg, 100)}\n\n`;
        md += `## Проект\n`;
        md += `- **Тип:** ${dash(fields.type, 200)}\n`;
        md += `- **Бюджет:** ${dash(fields.budget, 100)}\n`;
        md += `- **Сроки:** ${dash(fields.timeline, 100)}\n\n`;
        md += `## Задача\n${dash(fields.desc, 5000)}\n\n`;
        md += `## Комментарии\n${dash(fields.comments, 5000)}\n`;

        const name = sanitize(fields.name, 100);
        const slug = name && name !== '—'
            ? '-' + name.trim().replace(/[^a-zA-Zа-яА-ЯёЁ0-9\s-]/g, '').replace(/\s+/g, '-')
            : '';
        const filename = `brief-${date}${slug}.md`;
        const blob = new Blob([md], { type: 'text/markdown' });

        const form = new FormData();
        form.append('chat_id', CHAT_ID);
        form.append('document', blob, filename);

        const docRes = await fetch(`https://api.telegram.org/bot${TOKEN}/sendDocument`, {
            method: 'POST',
            body: form
        });
        const docData = await docRes.json();
        if (!docData.ok) {
            console.error('sendDocument failed:', docData.description);
        }
    }

    return res.status(200).json({ ok: true });
}
