import { t, type ParsedCommand } from '@yordamchi/shared';
import { miniAppKeyboard } from '../keyboards/common';
import { successMessage } from '../messages/formatter';
import { logParsedActionSuccess } from './action-logging';
import { executeParsedAction } from './executor';
import { quickActionLabel, resolveQuickActionFromCallbackData, runQuickAction } from './quick-actions';
import { hasRegisteredPhone, promptPhoneRegistration } from './registration';
import type { AppContext } from '../../core/app-context';
import type { TelegramCallbackQuery } from '../../core/telegram/types';

export async function handleCallback(app: AppContext, callbackQuery: TelegramCallbackQuery) {
  const userId = await app.userService.upsertTelegramUser(callbackQuery.from, 'UTC');
  const profile = await app.userService.getProfileSnapshot(userId, 'UTC');
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

  const quickAction = resolveQuickActionFromCallbackData(callbackQuery.data);

  if (quickAction) {
    await app.stateService.clear(userId);
    await app.telegram.answerCallbackQuery(callbackQuery.id, quickActionLabel(locale, quickAction));
    await runQuickAction(app, {
      action: quickAction,
      chatId,
      isPremium: profile.subscription.isPremium,
      locale,
      timeZone,
      userId,
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
    await logParsedActionSuccess(app, {
      parsed: payload.payload as unknown as ParsedCommand,
      source: 'callback_confirm',
      userId,
    });
    await app.stateService.clear(userId);
    await app.telegram.answerCallbackQuery(callbackQuery.id, t(locale, 'common.save'));
    const parsed = payload.payload as unknown as ParsedCommand;
    await app.telegram.sendMessage(chatId, successMessage(locale, parsed, timeZone), {
      reply_markup: miniAppKeyboard(locale, app.env.TELEGRAM_MINIAPP_URL),
    });
    return;
  }

  await app.telegram.answerCallbackQuery(callbackQuery.id);
}
