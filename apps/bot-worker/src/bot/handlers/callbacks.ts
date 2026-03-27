import { t, type ParsedCommand } from '@yordamchi/shared';
import { miniAppKeyboard } from '../keyboards/common';
import { successMessage } from '../messages/formatter';
import { executeParsedAction } from './executor';
import { hasRegisteredPhone, promptPhoneRegistration } from './registration';
import type { AppContext } from '../../core/app-context';
import type { TelegramCallbackQuery } from '../../core/telegram/types';

export async function handleCallback(app: AppContext, callbackQuery: TelegramCallbackQuery) {
  const userId = await app.userService.upsertTelegramUser(callbackQuery.from, 'Asia/Tashkent');
  const profile = await app.userService.getProfileSnapshot(userId, 'Asia/Tashkent');
  const chatId = callbackQuery.message?.chat.id;
  const locale = profile.locale;
  const timeZone = profile.timezone;

  if (!chatId) {
    return;
  }

  if (!hasRegisteredPhone(profile)) {
    await app.telegram.answerCallbackQuery(callbackQuery.id, t(locale, 'bot.phonePending'));
    await promptPhoneRegistration(app, chatId, locale, userId, 'bot.phonePending');
    return;
  }

  if (callbackQuery.data === 'cancel_pending') {
    await app.stateService.clear(userId);
    await app.telegram.answerCallbackQuery(callbackQuery.id, t(locale, 'common.cancel'));
    await app.telegram.sendMessage(chatId, t(locale, 'bot.pendingCancelled'), {
      reply_markup: miniAppKeyboard(locale, app.env.TELEGRAM_MINIAPP_URL),
    });
    return;
  }

  if (callbackQuery.data === 'confirm_pending') {
    const state = await app.stateService.get(userId);
    const payload = state?.payload as { action?: string; payload?: Record<string, unknown> } | undefined;

    if (!payload?.payload) {
      await app.telegram.answerCallbackQuery(callbackQuery.id, t(locale, 'bot.clarification'));
      return;
    }

    await executeParsedAction(app, userId, locale, timeZone, payload.payload as never);
    await app.stateService.clear(userId);
    const intent = (typeof payload.payload.intent === 'string' ? payload.payload.intent : 'unknown') as ParsedCommand['intent'];
    await app.telegram.answerCallbackQuery(callbackQuery.id, t(locale, 'common.save'));
    await app.telegram.sendMessage(chatId, successMessage(locale, intent), {
      reply_markup: miniAppKeyboard(locale, app.env.TELEGRAM_MINIAPP_URL),
    });
  }
}
