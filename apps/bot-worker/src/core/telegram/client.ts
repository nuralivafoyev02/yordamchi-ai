import type { EnvBindings } from '../config/env';
import { AppError } from '../errors/app-error';
import type { TelegramInlineKeyboard } from './types';

interface SendMessageOptions {
  parse_mode?: 'HTML' | 'MarkdownV2';
  reply_markup?: TelegramInlineKeyboard;
}

export class TelegramClient {
  constructor(private readonly env: EnvBindings) {}

  async sendMessage(chatId: number, text: string, options: SendMessageOptions = {}) {
    return this.call('sendMessage', {
      chat_id: chatId,
      text,
      ...options,
    });
  }

  async answerCallbackQuery(callbackQueryId: string, text?: string) {
    return this.call('answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      text,
      show_alert: false,
    });
  }

  private async call(method: string, body: Record<string, unknown>) {
    const response = await fetch(`https://api.telegram.org/bot${this.env.TELEGRAM_BOT_TOKEN}/${method}`, {
      body: JSON.stringify(body),
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new AppError(`Telegram API ${method} failed`, 502, 'TELEGRAM_API_ERROR', {
        errorText,
        method,
      });
    }

    return response.json<unknown>();
  }
}
