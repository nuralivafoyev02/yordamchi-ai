import type { AppLocale, ParsedCommand } from '@yordamchi/shared';
import { t } from '@yordamchi/shared';

export function helpMessage(locale: AppLocale) {
  return [
    `<b>${t(locale, 'app.name')}</b>`,
    t(locale, 'bot.welcome'),
    '',
    'Examples:',
    '• Ertaga 200 ming chiqim qilaman',
    '• Dushanba kuni uchrashuv',
    '• Ali 100 dollar qarz berdi',
    '• Oylik uchun 3 million limit',
  ].join('\n');
}

export function fallbackMessage(locale: AppLocale) {
  return t(locale, 'bot.fallback');
}

export function confirmationMessage(locale: AppLocale, parsed: ParsedCommand) {
  if (parsed.plan) {
    return `${t(locale, 'bot.clarification')}\n\n<b>${parsed.plan.title}</b>\n${parsed.plan.scheduledDate} ${parsed.plan.scheduledTime ?? ''}`.trim();
  }

  if (parsed.transaction) {
    return `${t(locale, 'bot.clarification')}\n\n${parsed.transaction.direction}: <b>${parsed.transaction.amount} ${parsed.transaction.currency}</b>`;
  }

  if (parsed.debt) {
    return `${t(locale, 'bot.clarification')}\n\n${parsed.debt.counterpartyName}: <b>${parsed.debt.amount} ${parsed.debt.currency}</b>`;
  }

  if (parsed.limit) {
    return `${t(locale, 'bot.clarification')}\n\n${parsed.limit.categorySlug}: <b>${parsed.limit.amount} ${parsed.limit.currency}</b>`;
  }

  return t(locale, 'bot.clarification');
}

export function successMessage(locale: AppLocale, intent: ParsedCommand['intent']) {
  switch (intent) {
    case 'create_plan':
      return t(locale, 'bot.planCreated');
    case 'create_income':
    case 'create_expense':
      return t(locale, 'bot.transactionCreated');
    case 'create_debt':
      return t(locale, 'bot.debtCreated');
    case 'set_limit':
      return t(locale, 'bot.limitCreated');
    default:
      return t(locale, 'common.confirm');
  }
}
