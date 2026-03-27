import type { AppLocale, ParsedCommand } from '@yordamchi/shared';
import { t } from '@yordamchi/shared';

function resolveCategoryLabel(locale: AppLocale, slug: string) {
  const key = `categories.${slug}`;
  const localized = t(locale, key);
  return localized === key ? slug : localized;
}

function resolveTransactionDirection(locale: AppLocale, direction: 'income' | 'expense') {
  return direction === 'income' ? t(locale, 'finance.income') : t(locale, 'finance.expense');
}

export function helpMessage(locale: AppLocale) {
  return [
    `<b>${t(locale, 'app.name')}</b>`,
    t(locale, 'bot.welcome'),
    '',
    t(locale, 'bot.examplesTitle'),
    `• ${t(locale, 'bot.exampleExpense')}`,
    `• ${t(locale, 'bot.examplePlan')}`,
    `• ${t(locale, 'bot.exampleDebt')}`,
    `• ${t(locale, 'bot.exampleLimit')}`,
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
    return `${t(locale, 'bot.clarification')}\n\n${resolveTransactionDirection(locale, parsed.transaction.direction)}: <b>${parsed.transaction.amount} ${parsed.transaction.currency}</b>`;
  }

  if (parsed.debt) {
    return `${t(locale, 'bot.clarification')}\n\n${parsed.debt.counterpartyName}: <b>${parsed.debt.amount} ${parsed.debt.currency}</b>`;
  }

  if (parsed.limit) {
    return `${t(locale, 'bot.clarification')}\n\n${resolveCategoryLabel(locale, parsed.limit.categorySlug)}: <b>${parsed.limit.amount} ${parsed.limit.currency}</b>`;
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

export function summaryMessage(
  locale: AppLocale,
  counts: {
    accounts: number;
    debts: number;
    plans: number;
  },
) {
  return [
    `<b>${t(locale, 'bot.summaryTitle')}</b>`,
    t(locale, 'bot.summaryPlans', { count: counts.plans }),
    t(locale, 'bot.summaryDebts', { count: counts.debts }),
    t(locale, 'bot.summaryAccounts', { count: counts.accounts }),
  ].join('\n');
}
