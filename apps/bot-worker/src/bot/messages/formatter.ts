import type { AppLocale, DashboardDebt, DashboardPlan, ParsedCommand } from '@yordamchi/shared';
import { formatMoney, t } from '@yordamchi/shared';

const localeTags: Record<AppLocale, string> = {
  en: 'en-US',
  ru: 'ru-RU',
  uz: 'uz-UZ',
};

function resolveCategoryLabel(locale: AppLocale, slug: string) {
  const key = `categories.${slug}`;
  const localized = t(locale, key);
  return localized === key ? slug : localized;
}

function resolveTransactionDirection(locale: AppLocale, direction: 'income' | 'expense') {
  return direction === 'income' ? t(locale, 'finance.income') : t(locale, 'finance.expense');
}

function resolveDebtDirection(locale: AppLocale, direction: 'borrowed' | 'lent') {
  return direction === 'borrowed' ? t(locale, 'finance.borrowed') : t(locale, 'finance.lent');
}

function resolveLocaleTag(locale: AppLocale) {
  return localeTags[locale] ?? localeTags.uz;
}

function normalizeInput(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function quoteInput(text: string) {
  const normalized = normalizeInput(text);
  return normalized ? `"${normalized}"` : '-';
}

function formatDateTime(locale: AppLocale, iso: string, timeZone: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(resolveLocaleTag(locale), {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
    ...options,
  }).format(new Date(iso));
}

function formatTime(locale: AppLocale, iso: string, timeZone: string) {
  return new Intl.DateTimeFormat(resolveLocaleTag(locale), {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(new Date(iso));
}

function formatDate(locale: AppLocale, iso: string, timeZone: string) {
  return new Intl.DateTimeFormat(resolveLocaleTag(locale), {
    dateStyle: 'medium',
    timeZone,
  }).format(new Date(iso));
}

function previewLines(locale: AppLocale, parsed: ParsedCommand, timeZone: string) {
  if (parsed.plan) {
    return [
      `• ${t(locale, 'common.plan')}: ${parsed.plan.title}`,
      `• ${formatDateTime(locale, parsed.plan.dueAt, timeZone)}`,
    ];
  }

  if (parsed.transaction) {
    const lines = [
      `• ${resolveTransactionDirection(locale, parsed.transaction.direction)}: ${formatMoney(parsed.transaction.amount, parsed.transaction.currency, resolveLocaleTag(locale))}`,
    ];

    if (parsed.transaction.note) {
      lines.push(`• ${parsed.transaction.note}`);
    }

    if (parsed.transaction.status === 'scheduled') {
      lines.push(`• ${formatDateTime(locale, parsed.transaction.occurredAt, timeZone)}`);
    }

    return lines;
  }

  if (parsed.debt) {
    const lines = [
      `• ${resolveDebtDirection(locale, parsed.debt.direction)}: ${parsed.debt.counterpartyName}`,
      `• ${formatMoney(parsed.debt.amount, parsed.debt.currency, resolveLocaleTag(locale))}`,
    ];

    if (parsed.debt.dueAt) {
      lines.push(`• ${formatDateTime(locale, parsed.debt.dueAt, timeZone)}`);
    }

    if (parsed.debt.note) {
      lines.push(`• ${parsed.debt.note}`);
    }

    return lines;
  }

  if (parsed.limit) {
    return [
      `• ${resolveCategoryLabel(locale, parsed.limit.categorySlug)}: ${formatMoney(parsed.limit.amount, parsed.limit.currency, resolveLocaleTag(locale))}`,
      `• ${parsed.limit.monthStart}`,
    ];
  }

  return [];
}

function successLabel(locale: AppLocale, intent: ParsedCommand['intent']) {
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
    case 'repay_debt':
      return t(locale, 'bot.pendingSaved');
    default:
      return t(locale, 'common.saved');
  }
}

function formatDebtLine(locale: AppLocale, debt: DashboardDebt, timeZone: string) {
  const amount = formatMoney(debt.principal_amount, debt.principal_currency, resolveLocaleTag(locale));
  const dueAt = debt.due_at ? `, ${formatDate(locale, debt.due_at, timeZone)}` : '';
  return `• ${debt.counterparty_name}: ${amount} (${resolveDebtDirection(locale, debt.direction)}${dueAt})`;
}

function formatTodayPlanLine(locale: AppLocale, plan: DashboardPlan, timeZone: string) {
  return `• ${formatTime(locale, plan.due_at, timeZone)} - ${plan.title}`;
}

export function helpMessage(locale: AppLocale) {
  return [
    `🧭 ${t(locale, 'bot.guideIntro')}`,
    '',
    `1. ${t(locale, 'bot.guideFinanceTitle')}`,
    `• ${t(locale, 'bot.exampleExpense')}`,
    `• ${t(locale, 'bot.exampleIncome')}`,
    '',
    `2. ${t(locale, 'bot.guidePlanTitle')}`,
    `• ${t(locale, 'bot.examplePlan')}`,
    `• ${t(locale, 'bot.examplePlanTimed')}`,
    '',
    `3. ${t(locale, 'bot.guideDebtTitle')}`,
    `• ${t(locale, 'bot.exampleDebt')}`,
    `• ${t(locale, 'bot.exampleLimit')}`,
    '',
    `4. ${t(locale, 'bot.guideQuickActionsTitle')}`,
    `• ${t(locale, 'bot.quickTodayPlans')}`,
    `• ${t(locale, 'finance.debts')}`,
    `• ${t(locale, 'bot.quickGuide')}`,
    `• ${t(locale, 'common.premium')}`,
  ].join('\n');
}

export function startMessage(locale: AppLocale) {
  return `👋 ${t(locale, 'bot.startShort')}`;
}

export function openHintMessage(locale: AppLocale) {
  return `⬅️ ${t(locale, 'bot.openHint')}`;
}

export function fallbackMessage(locale: AppLocale, rawInput: string) {
  return [
    `💬 ${t(locale, 'bot.youSaid')} ${quoteInput(rawInput)}`,
    '',
    `🪄 ${t(locale, 'bot.fallback')}`,
  ].join('\n');
}

export function confirmationMessage(locale: AppLocale, parsed: ParsedCommand, rawInput: string, timeZone: string) {
  const details = previewLines(locale, parsed, timeZone);
  const lines = [
    `🧠 ${t(locale, 'bot.clarification')}`,
    '',
    `💬 ${t(locale, 'bot.youSaid')} ${quoteInput(rawInput)}`,
    `📝 ${t(locale, 'bot.understoodAs')}`,
    ...(details.length ? details : [`• ${t(locale, 'bot.clarification')}`]),
    '',
    `👇 ${t(locale, 'bot.confirmPrompt')}`,
  ];

  return lines.join('\n');
}

export function successMessage(locale: AppLocale, parsed: ParsedCommand, timeZone: string) {
  const details = previewLines(locale, parsed, timeZone);
  return [
    `✅ ${successLabel(locale, parsed.intent)}`,
    ...(details.length ? ['', `📝 ${t(locale, 'bot.understoodAs')}`, ...details] : []),
  ].join('\n');
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
    `📊 ${t(locale, 'bot.summaryTitle')}`,
    `• ${t(locale, 'bot.summaryPlans', { count: counts.plans })}`,
    `• ${t(locale, 'bot.summaryDebts', { count: counts.debts })}`,
    `• ${t(locale, 'bot.summaryAccounts', { count: counts.accounts })}`,
  ].join('\n');
}

export function todayPlansMessage(locale: AppLocale, plans: DashboardPlan[], timeZone: string) {
  if (!plans.length) {
    return `📅 ${t(locale, 'home.noEventsToday')}`;
  }

  return [`📅 ${t(locale, 'bot.quickTodayPlans')}`, ...plans.map((plan) => formatTodayPlanLine(locale, plan, timeZone))].join('\n');
}

export function debtsMessage(locale: AppLocale, debts: DashboardDebt[], timeZone: string) {
  if (!debts.length) {
    return `💳 ${t(locale, 'finance.noDebts')}`;
  }

  return [`💳 ${t(locale, 'finance.debts')}`, ...debts.map((debt) => formatDebtLine(locale, debt, timeZone))].join('\n');
}

export function premiumMessage(locale: AppLocale, isPremium: boolean) {
  return [
    `⭐ ${t(locale, 'common.premium')}`,
    `• ${isPremium ? t(locale, 'bot.premiumActive') : t(locale, 'premiumBenefits')}`,
    ...(isPremium ? [`• ${t(locale, 'bot.premiumBenefits')}`] : []),
    `• ${t(locale, 'bot.premiumPrice')}`,
    `• ${t(locale, 'bot.premiumContact')}`,
  ].join('\n');
}

export function reminderMessage(locale: AppLocale, title: string, body: string) {
  const trimmedBody = normalizeInput(body);

  if (!trimmedBody) {
    return `🛎 ${title}`;
  }

  return `🛎 ${title}: ${trimmedBody}`;
}
