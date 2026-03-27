import type { IntentName } from '../../domain/enums';
import type { AmountParseResult, DateParseResult, IntentScore } from '../../domain/types';
import { normalizeText } from '../normalizers/normalizeText';

const KEYWORDS: Record<Exclude<IntentName, 'unknown'>, string[]> = {
  create_debt: ['qarz', 'debt', 'долг', 'lent', 'borrowed'],
  create_expense: ['chiqim', 'expense', 'расход', 'pay', 'paid', 'xarajat', 'spent', 'soliq'],
  create_income: ['kirim', 'income', 'доход', 'salary', 'maosh', 'oylik', 'received', 'oldim'],
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

  if (/\b(qarz|debt|долг)\b/u.test(normalized) && /\b(qaytardim|repay|вернул)\b/u.test(normalized)) {
    pushScore(scores, 'repay_debt', 0.6, 'debt_repayment_phrase');
  }

  if (/\b(chiqim|expense|расход)\b/u.test(normalized)) {
    pushScore(scores, 'create_expense', 0.34, 'expense_direct_keyword');
  }

  if (/\b(oldim|received|получил|tushdi|зарплата|salary|maosh|oylik)\b/u.test(normalized)) {
    pushScore(scores, 'create_income', 0.34, 'income_direct_keyword');
  }

  if (/\b(kirim|income|доход)\b/u.test(normalized)) {
    pushScore(scores, 'create_income', 0.34, 'income_direct_keyword');
  }

  if (/\b(qarz|debt|долг)\b/u.test(normalized) && /\b(berdi|gave|lent|одолжил|oldim|borrowed)\b/u.test(normalized)) {
    pushScore(scores, 'create_debt', 0.44, 'debt_direct_phrase');
  }

  if (/\b(limit|лимит)\b/u.test(normalized)) {
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
