import type { AppLocale } from '@yordamchi/shared';
import { t } from '@yordamchi/shared';
import type { TelegramInlineKeyboard, TelegramRemoveKeyboard, TelegramReplyKeyboard } from '../../core/telegram/types';

export function miniAppKeyboard(locale: AppLocale, url: string): TelegramInlineKeyboard {
  return {
    inline_keyboard: [[{ text: t(locale, 'common.openMiniApp'), web_app: { url } }]],
  };
}

export function confirmationKeyboard(locale: AppLocale): TelegramInlineKeyboard {
  return {
    inline_keyboard: [
      [
        { callback_data: 'confirm_pending', text: t(locale, 'common.confirm') },
        { callback_data: 'cancel_pending', text: t(locale, 'common.cancel') },
      ],
    ],
  };
}

export function phoneRegistrationKeyboard(locale: AppLocale): TelegramReplyKeyboard {
  return {
    keyboard: [[{ request_contact: true, text: t(locale, 'common.sharePhone') }]],
    one_time_keyboard: true,
    resize_keyboard: true,
  };
}

export function removeKeyboard(): TelegramRemoveKeyboard {
  return {
    remove_keyboard: true,
  };
}
