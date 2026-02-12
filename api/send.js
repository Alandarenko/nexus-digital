export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { text, fields } = req.body;
    if (!text) return res.status(400).json({ error: 'Missing text' });

    const TOKEN = process.env.TG_BOT_TOKEN;
    const CHAT_ID = process.env.TG_CHAT_ID;

    // Send text message
    const tgRes = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'Markdown' })
    });
    const data = await tgRes.json();
    if (!data.ok) return res.status(500).json({ ok: false, error: data.description });

    // Send .md file if fields are provided
    if (fields) {
        const d = new Date();
        const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const dash = (v) => v && v !== '—' ? v : '—';

        let md = `# Бриф — ${dash(fields.name)}\n\n`;
        md += `## Контакты\n`;
        md += `- **Имя:** ${dash(fields.name)}\n`;
        md += `- **Телефон:** ${dash(fields.phone)}\n`;
        md += `- **Email:** ${dash(fields.email)}\n`;
        md += `- **Telegram:** ${dash(fields.tg)}\n\n`;
        md += `## Проект\n`;
        md += `- **Тип:** ${dash(fields.type)}\n`;
        md += `- **Бюджет:** ${dash(fields.budget)}\n`;
        md += `- **Сроки:** ${dash(fields.timeline)}\n\n`;
        md += `## Задача\n${dash(fields.desc)}\n\n`;
        md += `## Комментарии\n${dash(fields.comments)}\n`;

        const filename = `brief-${date}.md`;
        const blob = new Blob([md], { type: 'text/markdown' });

        const form = new FormData();
        form.append('chat_id', CHAT_ID);
        form.append('document', blob, filename);

        await fetch(`https://api.telegram.org/bot${TOKEN}/sendDocument`, {
            method: 'POST',
            body: form
        });
    }

    return res.status(200).json({ ok: true });
}
