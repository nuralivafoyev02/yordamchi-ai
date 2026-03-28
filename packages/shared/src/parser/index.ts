import type { AppLocale, CurrencyCode } from '../domain/enums';
import type { ParsedCommand, ParsedExpenseOrIncome, ParsedPlan } from '../domain/types';
import { parseAmount } from './amount/parseAmount';
import { parseDateExpression } from './date/parseDateExpression';
import { parseDebt } from './debt/parseDebt';
import { parseIntent } from './intent/parseIntent';
import { parseLimit } from './limit/parseLimit';
import { cleanupResidualText, detectCategorySlug, humanizeTitle } from './normalizers/helpers';
import { normalizeText } from './normalizers/normalizeText';
import { parseReminder } from './reminder/parseReminder';

interface ParseCommandOptions {
  defaultCurrency?: CurrencyCode;
  locale?: AppLocale;
  now?: Date;
  timeZone?: string;
}

function createPlan(text: string, date: ReturnType<typeof parseDateExpression>, reminderOffsetMinutes: number | null): ParsedPlan | undefined {
  if (!date.matched || !date.dueAt || !date.date) {
    return undefined;
  }

  const title = humanizeTitle(cleanupResidualText(text, [date.matchedText]), 'New plan');

  return {
    dueAt: date.dueAt,
    priority: 'medium',
    reminderOffsetMinutes: reminderOffsetMinutes ?? 0,
    repeatRule: 'none',
    scheduledDate: date.date,
    scheduledTime: date.time,
    status: 'pending',
    title,
  };
}

function createTransaction(
  text: string,
  direction: 'income' | 'expense',
  amount: ReturnType<typeof parseAmount>,
  date: ReturnType<typeof parseDateExpression>,
  now: Date,
): ParsedExpenseOrIncome | undefined {
  if (!amount.amount || !amount.currency) {
    return undefined;
  }

  const occurredAt = date.dueAt ?? now.toISOString();
  const status = date.matched && date.dueAt && new Date(date.dueAt).getTime() > now.getTime() ? 'scheduled' : 'posted';

  return {
    amount: amount.amount,
    categorySlug: detectCategorySlug(text, direction),
    currency: amount.currency,
    direction,
    note: cleanupResidualText(text, [amount.raw, date.matchedText]),
    occurredAt,
    status,
  };
}

export function parseCommand(text: string, options: ParseCommandOptions = {}): ParsedCommand {
  const locale = options.locale ?? 'uz';
  const timeZone = options.timeZone ?? 'UTC';
  const now = options.now ?? new Date();
  const defaultCurrency = options.defaultCurrency ?? 'UZS';
  const normalizedText = normalizeText(text);
  const amount = parseAmount(normalizedText, defaultCurrency);
  const date = parseDateExpression(normalizedText, locale, timeZone, now);
  const reminder = parseReminder(normalizedText);
  const scores = parseIntent(normalizedText, amount, date);
  const topIntent = scores[0];
  const confidence = topIntent?.score ?? 0.1;

  if (!topIntent || topIntent.intent === 'unknown' || confidence < 0.45) {
    return {
      amount,
      confidence,
      date,
      fallbackMessageKey: 'bot.fallback',
      intent: 'unknown',
      locale,
      normalizedText,
      reminder,
      scores,
    };
  }

  if (topIntent.intent === 'create_plan') {
    const plan = createPlan(normalizedText, date, reminder.offsetMinutes);

    return {
      amount,
      confidence,
      date,
      fallbackMessageKey: plan ? undefined : 'bot.clarification',
      intent: topIntent.intent,
      locale,
      normalizedText,
      plan,
      reminder,
      scores,
    };
  }

  if (topIntent.intent === 'create_income' || topIntent.intent === 'create_expense') {
    const transaction = createTransaction(
      normalizedText,
      topIntent.intent === 'create_income' ? 'income' : 'expense',
      amount,
      date,
      now,
    );

    return {
      amount,
      confidence,
      date,
      fallbackMessageKey: transaction ? undefined : 'bot.clarification',
      intent: topIntent.intent,
      locale,
      normalizedText,
      reminder,
      scores,
      transaction,
    };
  }

  if (topIntent.intent === 'create_debt') {
    const debt = parseDebt(normalizedText, defaultCurrency, locale, timeZone, now);

    return {
      amount,
      confidence,
      date,
      debt: debt ?? undefined,
      fallbackMessageKey: debt ? undefined : 'bot.clarification',
      intent: topIntent.intent,
      locale,
      normalizedText,
      reminder,
      scores,
    };
  }

  if (topIntent.intent === 'set_limit') {
    const limit = parseLimit(normalizedText, defaultCurrency, locale, timeZone, now);

    return {
      amount,
      confidence,
      date,
      fallbackMessageKey: limit ? undefined : 'bot.clarification',
      intent: topIntent.intent,
      limit: limit ?? undefined,
      locale,
      normalizedText,
      reminder,
      scores,
    };
  }

  return {
    amount,
    confidence,
    date,
    intent: topIntent.intent,
    locale,
    normalizedText,
    reminder,
    scores,
  };
}
