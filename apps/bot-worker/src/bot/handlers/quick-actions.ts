import { t, type AppLocale } from '@yordamchi/shared';
import { miniAppKeyboard } from '../keyboards/common';
import { debtsMessage, helpMessage, premiumMessage, todayPlansMessage } from '../messages/formatter';
import type { AppContext } from '../../core/app-context';

export type QuickAction = 'debts' | 'guide' | 'premium' | 'today_plans';

function normalizeActionText(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function quickActionLabel(locale: AppLocale, action: QuickAction) {
  switch (action) {
    case 'today_plans':
      return t(locale, 'bot.quickTodayPlans');
    case 'debts':
      return t(locale, 'finance.debts');
    case 'guide':
      return t(locale, 'bot.quickGuide');
    case 'premium':
      return t(locale, 'common.premium');
  }
}

export function resolveQuickActionFromCallbackData(data?: string) {
  switch (data) {
    case 'quick_today_plans':
      return 'today_plans' as const;
    case 'quick_debts':
      return 'debts' as const;
    case 'quick_guide':
      return 'guide' as const;
    case 'quick_premium':
      return 'premium' as const;
    default:
      return null;
  }
}

export function resolveQuickActionFromText(locale: AppLocale, text: string) {
  const normalized = normalizeActionText(text);

  if (normalized === normalizeActionText(t(locale, 'bot.quickTodayPlans'))) {
    return 'today_plans' as const;
  }

  if (normalized === normalizeActionText(t(locale, 'finance.debts'))) {
    return 'debts' as const;
  }

  if (normalized === normalizeActionText(t(locale, 'bot.quickGuide'))) {
    return 'guide' as const;
  }

  if (normalized === normalizeActionText(t(locale, 'common.premium'))) {
    return 'premium' as const;
  }

  return null;
}

export async function runQuickAction(
  app: AppContext,
  options: {
    action: QuickAction;
    chatId: number;
    isPremium: boolean;
    locale: AppLocale;
    timeZone: string;
    userId: string;
  },
) {
  const { action, chatId, isPremium, locale, timeZone, userId } = options;

  switch (action) {
    case 'today_plans': {
      const plans = await app.userService.listTodayPlans(userId, timeZone);
      await app.telegram.sendMessage(chatId, todayPlansMessage(locale, plans, timeZone), {
        reply_markup: miniAppKeyboard(locale, app.env.TELEGRAM_MINIAPP_URL),
      });
      return;
    }

    case 'debts': {
      const dashboard = await app.userService.buildDashboard(userId, timeZone);
      await app.telegram.sendMessage(chatId, debtsMessage(locale, dashboard.openDebts, timeZone), {
        reply_markup: miniAppKeyboard(locale, app.env.TELEGRAM_MINIAPP_URL),
      });
      return;
    }

    case 'guide':
      await app.telegram.sendMessage(chatId, helpMessage(locale), {
        reply_markup: miniAppKeyboard(locale, app.env.TELEGRAM_MINIAPP_URL),
      });
      return;

    case 'premium':
      await app.telegram.sendMessage(chatId, premiumMessage(locale, isPremium), {
        reply_markup: miniAppKeyboard(locale, app.env.TELEGRAM_MINIAPP_URL),
      });
      return;
  }
}
