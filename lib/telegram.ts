const TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const BASE = `https://api.telegram.org/bot${TOKEN}`;

async function call(method: string, body: object): Promise<unknown> {
  const res = await fetch(`${BASE}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function sendMessage(
  chatId: number | string,
  text: string,
  extra?: object
): Promise<void> {
  await call('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', ...extra });
}

export async function answerCallback(id: string, text?: string): Promise<void> {
  await call('answerCallbackQuery', { callback_query_id: id, text });
}

export async function setWebhook(url: string): Promise<unknown> {
  return call('setWebhook', { url, allowed_updates: ['message', 'callback_query'] });
}

export async function deleteWebhook(): Promise<unknown> {
  return call('deleteWebhook', {});
}

export function mainMenuKeyboard() {
  return {
    keyboard: [
      ['➕ Додати виробіток', '📊 Мій стан'],
      ['📋 Позиції', '📦 Залишки'],
      ['🧮 Комплекти', '🎯 План'],
      ['🚚 Відвантаження', '📈 Статистика'],
      ['🔗 Таблиця'],
    ],
    resize_keyboard: true,
  };
}
