/**
 * NEXUS Digital — автоматическое обновление новостей
 *
 * Парсит RSS-ленты IT-изданий, переписывает через YandexGPT
 * как уникальные экспертные заметки и сохраняет в data/news.json.
 *
 * Запускается через GitHub Actions раз в день.
 *
 * Переменные окружения:
 *   YANDEX_API_KEY  — API-ключ Yandex Cloud
 *   YANDEX_FOLDER_ID — ID каталога в Yandex Cloud
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// --- Конфигурация ---

const RSS_FEEDS = [
  'https://habr.com/ru/rss/hub/webdev/',
  'https://habr.com/ru/rss/hub/programming/',
  'https://www.cnews.ru/inc/rss/news.xml',
];

const MAX_NEWS = 5;
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'news.json');

const SYSTEM_PROMPT = `Ты — автор блога веб-студии NEXUS Digital, специализирующейся на веб-разработке, AI-интеграциях и импортозамещении.

На основе факта из новости напиши короткую экспертную заметку (2-3 предложения, максимум 300 символов).
Полностью своими словами. НЕ ссылайся на источник и НЕ упоминай название СМИ.
Пиши так, будто это твоя собственная экспертная заметка для клиентов студии.
Добавь практический вывод для бизнеса или разработчиков.
Не используй кавычки и не начинай с "Согласно..." или "По данным...".
Определи одну категорию для новости из списка: SEO, AI, Рынок, Технологии, E-commerce, Безопасность, Дизайн.
Ответ в формате JSON: {"summary": "текст", "tag": "категория"}`;

// --- Утилиты ---

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : require('http');
    client.get(url, { headers: { 'User-Agent': 'NexusDigital-NewsBot/1.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpGet(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
                   block.match(/<title>(.*?)<\/title>/) || [])[1] || '';
    const description = (block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) ||
                         block.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || '';
    const pubDate = (block.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1] || '';

    // Убираем HTML-теги из description
    const cleanDesc = description.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').trim();

    if (title.trim()) {
      items.push({
        title: title.trim(),
        description: cleanDesc.slice(0, 500),
        date: pubDate ? new Date(pubDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      });
    }
  }
  return items;
}

async function callYandexGPT(title, description) {
  const apiKey = process.env.YANDEX_API_KEY;
  const folderId = process.env.YANDEX_FOLDER_ID;

  if (!apiKey || !folderId) {
    throw new Error('YANDEX_API_KEY и YANDEX_FOLDER_ID должны быть заданы');
  }

  const body = JSON.stringify({
    modelUri: `gpt://${folderId}/yandexgpt-lite`,
    completionOptions: {
      stream: false,
      temperature: 0.4,
      maxTokens: '300'
    },
    messages: [
      { role: 'system', text: SYSTEM_PROMPT },
      { role: 'user', text: `Заголовок: ${title}\nТекст: ${description}` }
    ]
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'llm.api.cloud.yandex.net',
      path: '/foundationModels/v1/completion',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Api-Key ${apiKey}`,
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.result && parsed.result.alternatives && parsed.result.alternatives[0]) {
            const text = parsed.result.alternatives[0].message.text;
            // Парсим JSON из ответа
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const result = JSON.parse(jsonMatch[0]);
              resolve(result);
            } else {
              resolve({ summary: text.trim(), tag: 'Технологии' });
            }
          } else {
            reject(new Error('Unexpected YandexGPT response: ' + data));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function isRelevant(title) {
  const keywords = [
    'веб', 'web', 'сайт', 'разработ', 'frontend', 'backend', 'react', 'vue', 'node',
    'python', 'javascript', 'typescript', 'ai', 'ии', 'нейросет', 'gpt', 'llm',
    'seo', 'google', 'яндекс', 'yandex', 'e-commerce', 'интернет-магазин',
    'мобил', 'приложен', 'api', 'облак', 'cloud', 'docker', 'devops',
    'кибербез', 'безопасност', 'импортозамещ', 'bitrix', 'битрикс',
    'дизайн', 'ux', 'ui', 'css', 'html', 'telegram', 'бот',
    'стартап', 'startup', 'digital', 'цифров'
  ];
  const lower = title.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

// --- Основной процесс ---

async function main() {
  console.log('Начинаем сбор новостей...');

  // 1. Собираем RSS
  let allItems = [];
  for (const feedUrl of RSS_FEEDS) {
    try {
      console.log(`Парсим: ${feedUrl}`);
      const xml = await httpGet(feedUrl);
      const items = parseRSS(xml);
      console.log(`  Найдено ${items.length} записей`);
      allItems = allItems.concat(items);
    } catch (e) {
      console.error(`  Ошибка: ${e.message}`);
    }
  }

  // 2. Фильтруем по релевантности
  let relevant = allItems.filter(item => isRelevant(item.title));
  console.log(`Релевантных новостей: ${relevant.length}`);

  // 3. Сортируем по дате (свежие первые) и берём MAX_NEWS
  relevant.sort((a, b) => new Date(b.date) - new Date(a.date));
  relevant = relevant.slice(0, MAX_NEWS);

  if (relevant.length === 0) {
    console.log('Нет свежих релевантных новостей. Оставляем текущий news.json.');
    return;
  }

  // 4. Переписываем через YandexGPT
  const newsItems = [];
  for (const item of relevant) {
    try {
      console.log(`Рерайт: "${item.title.slice(0, 60)}..."`);
      const result = await callYandexGPT(item.title, item.description);

      newsItems.push({
        title: item.title.slice(0, 100),
        summary: result.summary || '',
        date: item.date,
        tag: result.tag || 'Технологии'
      });

      // Пауза между запросами к API
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      console.error(`  Ошибка рерайта: ${e.message}`);
    }
  }

  if (newsItems.length === 0) {
    console.log('Не удалось переписать ни одну новость.');
    return;
  }

  // 5. Генерируем свой заголовок (без упоминания источника)
  for (const item of newsItems) {
    // Обрезаем оригинальный заголовок и делаем его более нейтральным
    if (item.summary && item.summary.length > 10) {
      // Берём первое предложение summary как заголовок, если он информативнее
      const firstSentence = item.summary.split(/[.!?]/)[0];
      if (firstSentence.length > 20 && firstSentence.length < 100) {
        item.title = firstSentence;
      }
    }
  }

  // 6. Сохраняем
  const output = {
    updated: new Date().toISOString(),
    items: newsItems
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`Сохранено ${newsItems.length} новостей в ${OUTPUT_PATH}`);
}

main().catch(e => {
  console.error('Критическая ошибка:', e);
  process.exit(1);
});
