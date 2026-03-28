import type { AppLocale } from '@yordamchi/shared';
import { t } from '@yordamchi/shared';
import type { TelegramInlineKeyboard, TelegramRemoveKeyboard, TelegramReplyKeyboard } from '../../core/telegram/types';

export function miniAppKeyboard(locale: AppLocale, _url: string): TelegramReplyKeyboard {
  void _url;
  return {
    keyboard: [
      [
        { text: t(locale, 'bot.quickTodayPlans') },
        { text: t(locale, 'finance.debts') },
      ],
      [
        { text: t(locale, 'bot.quickGuide') },
        { text: t(locale, 'common.premium') },
      ],
    ],
    is_persistent: true,
    resize_keyboard: true,
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
