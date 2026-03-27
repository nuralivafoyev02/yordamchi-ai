import type { IntentName } from '../../domain/enums';
import type { AmountParseResult, DateParseResult, IntentScore } from '../../domain/types';
import { normalizeText } from '../normalizers/normalizeText';

const KEYWORDS: Record<Exclude<IntentName, 'unknown'>, string[]> = {
  create_debt: ['qarz', 'debt', 'долг', 'lent', 'borrowed'],
  create_expense: ['chiqim', 'expense', 'расход', 'расходы', 'pay', 'paid', 'xarajat', 'spent', 'soliq', 'потратил'],
  create_income: ['kirim', 'income', 'доход', 'salary', 'maosh', 'oylik', 'received', 'oldim', 'зарплата', 'зарплату', 'получил'],
  create_plan: ['reja', 'plan', 'meeting', 'uchrashuv', 'task', 'todo', 'напомни', 'eslat'],
  help: ['help', 'yordam', 'pomosh', 'помощь', '/start'],
  open_miniapp: ['mini app', 'open app', 'open mini', 'miniapp', 'ilova'],
  repay_debt: ['qaytardim', 'returned debt', 'repay', 'вернул'],
  set_limit: ['limit', 'лимит', 'chegara'],
  view_summary: ['summary', 'hisobot', 'balans', 'overview', 'статистика', 'итог'],
};

function pushScore(
  scores: IntentScore[],
  intent: IntentName,
  score: number,
  reason: string,
) {
  const existing = scores.find((entry) => entry.intent === intent);

  if (existing) {
    existing.score += score;
    existing.reasons.push(reason);
    return;
  }

  scores.push({ intent, reasons: [reason], score });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasPhrase(text: string, phrase: string): boolean {
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(phrase)}(?=$|[^\\p{L}\\p{N}])`, 'u').test(text);
}

function containsAny(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => hasPhrase(text, phrase));
}

export function parseIntent(text: string, amount: AmountParseResult, date: DateParseResult): IntentScore[] {
  const normalized = normalizeText(text);
  const scores: IntentScore[] = [];

  for (const [intent, keywords] of Object.entries(KEYWORDS) as [IntentName, string[]][]) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        pushScore(scores, intent, 0.22, `keyword:${keyword}`);
      }
    }
  }

  if (amount.amount) {
    pushScore(scores, 'create_expense', 0.18, 'amount_present');
    pushScore(scores, 'create_income', 0.18, 'amount_present');
    pushScore(scores, 'create_debt', 0.18, 'amount_present');
    pushScore(scores, 'set_limit', 0.16, 'amount_present');
    pushScore(scores, 'repay_debt', 0.12, 'amount_present');
  }

  if (date.matched) {
    pushScore(scores, 'create_plan', 0.24, 'date_present');
    pushScore(scores, 'create_expense', 0.08, 'date_present');
    pushScore(scores, 'create_income', 0.08, 'date_present');
    pushScore(scores, 'create_debt', 0.06, 'date_present');
  }

  if (containsAny(normalized, ['qarz', 'debt', 'долг']) && containsAny(normalized, ['qaytardim', 'repay', 'вернул'])) {
    pushScore(scores, 'repay_debt', 0.6, 'debt_repayment_phrase');
  }

  if (containsAny(normalized, ['chiqim', 'expense', 'расход', 'расходы', 'потратил'])) {
    pushScore(scores, 'create_expense', 0.34, 'expense_direct_keyword');
  }

  if (containsAny(normalized, ['oldim', 'received', 'получил', 'получила', 'получили', 'tushdi', 'зарплата', 'зарплату', 'salary', 'maosh', 'oylik'])) {
    pushScore(scores, 'create_income', 0.34, 'income_direct_keyword');
  }

  if (containsAny(normalized, ['kirim', 'income', 'доход'])) {
    pushScore(scores, 'create_income', 0.34, 'income_direct_keyword');
  }

  if (containsAny(normalized, ['qarz', 'debt', 'долг']) && containsAny(normalized, ['berdi', 'gave', 'lent', 'одолжил', 'oldim', 'borrowed'])) {
    pushScore(scores, 'create_debt', 0.44, 'debt_direct_phrase');
  }

  if (containsAny(normalized, ['limit', 'лимит'])) {
    pushScore(scores, 'set_limit', 0.44, 'limit_direct_keyword');
  }

  if (!amount.amount && date.matched) {
    pushScore(scores, 'create_plan', 0.28, 'date_without_amount');
  }

  if (!scores.length) {
    return [{ intent: 'unknown', reasons: ['no_signal'], score: 0.1 }];
  }

  return scores
    .map((score) => ({
      ...score,
      score: Math.min(score.score, 0.98),
    }))
    .sort((left, right) => right.score - left.score);
}
