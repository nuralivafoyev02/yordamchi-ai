import { t, type ParsedCommand } from '@yordamchi/shared';
import { confirmationKeyboard, miniAppKeyboard } from '../keyboards/common';
import { confirmationMessage, fallbackMessage, helpMessage, successMessage } from '../messages/formatter';
import { executeParsedAction } from './executor';
import type { AppContext } from '../../core/app-context';
import type { TelegramMessage } from '../../core/telegram/types';

const YES_VALUES = new Set(['ha', 'yes', 'да', 'ok', 'xa']);
const NO_VALUES = new Set(["yo'q", 'yoq', 'no', 'нет', 'cancel']);

async function handlePendingConfirmation(app: AppContext, userId: string, locale: 'uz' | 'en' | 'ru', timeZone: string, message: TelegramMessage) {
  const state = await app.stateService.get(userId);
  if (!state) {
    return false;
  }

  const normalized = (message.text ?? '').trim().toLowerCase();
  const payload = state.payload as { payload?: ParsedCommand } | undefined;

  if (YES_VALUES.has(normalized) && payload?.payload) {
    await executeParsedAction(app, userId, locale, timeZone, payload.payload);
    await app.stateService.clear(userId);
    await app.telegram.sendMessage(message.chat.id, 'Saved successfully.', {
      reply_markup: miniAppKeyboard(app.env.TELEGRAM_MINIAPP_URL),
    });
    return true;
  }

  if (NO_VALUES.has(normalized)) {
    await app.stateService.clear(userId);
    await app.telegram.sendMessage(message.chat.id, 'Cancelled. Send a corrected message.', {
      reply_markup: miniAppKeyboard(app.env.TELEGRAM_MINIAPP_URL),
    });
    return true;
  }

  return false;
}

export async function handleText(app: AppContext, message: TelegramMessage) {
  if (!message.text || !message.from) {
    return;
  }

  const timezone = 'Asia/Tashkent';
  const userId = await app.userService.upsertTelegramUser(message.from, timezone);
  const profile = await app.userService.getProfileSnapshot(userId, timezone);
  const locale = profile.locale;

  if (await handlePendingConfirmation(app, userId, locale, profile.timezone, message)) {
    return;
  }

  const parsed = app.nlu.parse(message.text, {
    defaultCurrency: profile.baseCurrency,
    locale,
    timeZone: profile.timezone,
  });

  if (parsed.intent === 'help') {
    await app.telegram.sendMessage(message.chat.id, helpMessage(locale), {
      parse_mode: 'HTML',
      reply_markup: miniAppKeyboard(app.env.TELEGRAM_MINIAPP_URL),
    });
    return;
  }

  if (parsed.intent === 'open_miniapp') {
    await app.telegram.sendMessage(message.chat.id, t(locale, 'common.openMiniApp'), {
      reply_markup: miniAppKeyboard(app.env.TELEGRAM_MINIAPP_URL),
    });
    return;
  }

  if (parsed.intent === 'view_summary') {
    const dashboard = await app.userService.buildDashboard(userId, profile.timezone);
    await app.telegram.sendMessage(
      message.chat.id,
      `<b>Summary</b>\nPlans: ${dashboard.upcomingPlans.length}\nDebts: ${dashboard.openDebts.length}\nAccounts: ${dashboard.accounts.length}`,
      {
        parse_mode: 'HTML',
        reply_markup: miniAppKeyboard(app.env.TELEGRAM_MINIAPP_URL),
      },
    );
    return;
  }

  if (parsed.intent === 'unknown') {
    await app.telegram.sendMessage(message.chat.id, fallbackMessage(locale), {
      reply_markup: miniAppKeyboard(app.env.TELEGRAM_MINIAPP_URL),
    });
    return;
  }

  try {
    if (parsed.confidence >= 0.78) {
      await executeParsedAction(app, userId, locale, profile.timezone, parsed);
      await app.telegram.sendMessage(message.chat.id, successMessage(locale, parsed.intent), {
        reply_markup: miniAppKeyboard(app.env.TELEGRAM_MINIAPP_URL),
      });
      return;
    }

    await app.stateService.setPendingConfirmation(userId, {
      action: parsed.intent === 'create_income' || parsed.intent === 'create_expense'
        ? 'create_transaction'
        : parsed.intent,
      payload: parsed as unknown as Record<string, unknown>,
    });
    await app.telegram.sendMessage(message.chat.id, confirmationMessage(locale, parsed), {
      parse_mode: 'HTML',
      reply_markup: confirmationKeyboard(),
    });
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code?: string }).code === 'PREMIUM_REQUIRED') {
      await app.telegram.sendMessage(message.chat.id, t(locale, 'bot.premiumRequired'), {
        reply_markup: miniAppKeyboard(app.env.TELEGRAM_MINIAPP_URL),
      });
      return;
    }

    throw error;
  }
}
