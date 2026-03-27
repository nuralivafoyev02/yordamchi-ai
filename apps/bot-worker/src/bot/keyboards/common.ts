import type { TelegramInlineKeyboard } from '../../core/telegram/types';

export function miniAppKeyboard(url: string): TelegramInlineKeyboard {
  return {
    inline_keyboard: [[{ text: 'Open Mini App', url }]],
  };
}

export function confirmationKeyboard(): TelegramInlineKeyboard {
  return {
    inline_keyboard: [
      [
        { callback_data: 'confirm_pending', text: 'Confirm' },
        { callback_data: 'cancel_pending', text: 'Cancel' },
      ],
    ],
  };
}
