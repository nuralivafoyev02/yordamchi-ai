import { t } from '@yordamchi/shared';
import { miniAppKeyboard } from '../keyboards/common';
import { executeParsedAction } from './executor';
import type { AppContext } from '../../core/app-context';
import type { TelegramCallbackQuery } from '../../core/telegram/types';

export async function handleCallback(app: AppContext, callbackQuery: TelegramCallbackQuery) {
  const user = await app.userService.findByTelegramUserId(callbackQuery.from.id);
  const chatId = callbackQuery.message?.chat.id;
  const locale = (user.language_code ?? 'uz') as 'uz' | 'en' | 'ru';
  const timeZone = user.timezone ?? 'Asia/Tashkent';

  if (!chatId) {
    return;
  }

  if (callbackQuery.data === 'cancel_pending') {
    await app.stateService.clear(user.id);
    await app.telegram.answerCallbackQuery(callbackQuery.id, t(locale, 'common.cancel'));
    await app.telegram.sendMessage(chatId, `${t(locale, 'common.cancel')}. ${t(locale, 'bot.fallback')}`);
    return;
  }

  if (callbackQuery.data === 'confirm_pending') {
    const state = await app.stateService.get(user.id);
    const payload = state?.payload as { action?: string; payload?: Record<string, unknown> } | undefined;

    if (!payload?.payload) {
      await app.telegram.answerCallbackQuery(callbackQuery.id, t(locale, 'bot.clarification'));
      return;
    }

    await executeParsedAction(app, user.id, locale, timeZone, payload.payload as never);
    await app.stateService.clear(user.id);
    await app.telegram.answerCallbackQuery(callbackQuery.id, t(locale, 'common.save'));
    await app.telegram.sendMessage(chatId, t(locale, 'common.save'), {
      reply_markup: miniAppKeyboard(app.env.TELEGRAM_MINIAPP_URL),
    });
  }
}
