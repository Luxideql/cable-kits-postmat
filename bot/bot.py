"""
Telegram Bot — кнопка запуска Web App.

Установка:
    pip install python-telegram-bot==20.7

Запуск:
    BOT_TOKEN=YOUR_TOKEN WEB_APP_URL=https://... python bot.py

Или с .env:
    pip install python-dotenv
    python bot.py
"""

import os
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo, MenuButtonWebApp
from telegram.ext import Application, CommandHandler, ContextTypes

# --- Загружаем .env если есть ---
try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))
except ImportError:
    pass

# --- Конфиг ---
BOT_TOKEN   = os.environ.get('BOT_TOKEN', 'PASTE_YOUR_BOT_TOKEN_HERE')
WEB_APP_URL = os.environ.get('WEB_APP_URL', 'https://Luxideql.github.io/cable-kits-postmat/')

if BOT_TOKEN == 'PASTE_YOUR_BOT_TOKEN_HERE':
    raise ValueError('Укажите BOT_TOKEN в .env или переменной окружения')

logging.basicConfig(
    format='%(asctime)s [%(levelname)s] %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)


# ------------------------------------------------------------------
# Handlers
# ------------------------------------------------------------------

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Команда /start — отправляет кнопку открытия Web App."""
    keyboard = InlineKeyboardMarkup([[
        InlineKeyboardButton(
            text='📦 Открыть систему',
            web_app=WebAppInfo(url=WEB_APP_URL)
        )
    ]])

    await update.message.reply_text(
        '📦 <b>KitAssemblyBot</b> — учёт кабельных комплектов\n\n'
        'Нажмите кнопку ниже чтобы открыть приложение:',
        parse_mode='HTML',
        reply_markup=keyboard
    )


async def help_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Команда /help."""
    await update.message.reply_text(
        'Команды:\n'
        '/start — открыть приложение\n'
        '/help — эта справка\n\n'
        f'Web App: {WEB_APP_URL}'
    )


async def post_init(application: Application) -> None:
    """Настраивает кнопку меню бота после запуска."""
    try:
        await application.bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(
                text='📦 Комплекты',
                web_app=WebAppInfo(url=WEB_APP_URL)
            )
        )
        logger.info('✅ Кнопка меню бота установлена: %s', WEB_APP_URL)
    except Exception as e:
        logger.warning('Не удалось установить кнопку меню: %s', e)


# ------------------------------------------------------------------
# Main
# ------------------------------------------------------------------

def main() -> None:
    logger.info('Запуск бота...')
    logger.info('Web App URL: %s', WEB_APP_URL)

    app = (
        Application.builder()
        .token(BOT_TOKEN)
        .post_init(post_init)
        .build()
    )

    app.add_handler(CommandHandler('start', start))
    app.add_handler(CommandHandler('help',  help_cmd))

    logger.info('✅ Бот запущен. Ctrl+C для остановки.')
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == '__main__':
    main()
