import { t } from '@yordamchi/shared';
import { miniAppKeyboard } from '../keyboards/common';
import { resolveTelegramUserContext } from './registration';
import type { AppContext } from '../../core/app-context';
import type { TelegramMessage } from '../../core/telegram/types';

export async function handleUnsupportedMedia(app: AppContext, message: TelegramMessage) {
  if (!message.from) {
    return;
  }

  const context = await resolveTelegramUserContext(app, message);

  if (!context) {
    return;
  }

  await app.telegram.sendMessage(message.chat.id, t(context.locale, 'bot.voicePending'), {
    reply_markup: miniAppKeyboard(context.locale, app.env.TELEGRAM_MINIAPP_URL),
  });
}
