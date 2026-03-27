import type { CurrencyCode } from '../../domain/enums';
import type { ParsedDebt } from '../../domain/types';
import { parseAmount } from '../amount/parseAmount';
import { parseDateExpression } from '../date/parseDateExpression';
import { cleanupResidualText, humanizeTitle } from '../normalizers/helpers';
import { normalizeText } from '../normalizers/normalizeText';

function extractCounterparty(text: string): string {
  const normalized = normalizeText(text);
  const fromMatch = normalized.match(/(?<name>[\p{L}\s]+?)dan\b/u);
  if (fromMatch?.groups?.name) {
    return humanizeTitle(fromMatch.groups.name.trim(), 'Counterparty');
  }

  const forMatch = normalized.match(/(?<name>[\p{L}\s]+?)uchun\b/u);
  if (forMatch?.groups?.name) {
    return humanizeTitle(forMatch.groups.name.trim(), 'Counterparty');
  }

  const leadMatch = normalized.match(/^(?<name>[\p{L}\s]+?)\s+\d/u);
  if (leadMatch?.groups?.name) {
    return humanizeTitle(leadMatch.groups.name.trim(), 'Counterparty');
  }

  return 'Counterparty';
}

export function parseDebt(
  text: string,
  defaultCurrency: CurrencyCode,
  locale: 'uz' | 'en' | 'ru',
  timeZone: string,
  now = new Date(),
): ParsedDebt | null {
  const normalized = normalizeText(text);
  const amount = parseAmount(normalized, defaultCurrency);

  if (!amount.amount || !amount.currency) {
    return null;
  }

  const borrowedPattern = /\b(qarz berdi|oldim|borrowed|borrow|взял|дали в долг|dal v dolg|odolzhil mne|одолжил мне)\b/u;
  const lentPattern = /\b(qarz berdim|lent|lend|одолжил|berdim|ya odolzhil)\b/u;

  const direction = borrowedPattern.test(normalized) && !lentPattern.test(normalized) ? 'borrowed' : 'lent';
  const date = parseDateExpression(normalized, locale, timeZone, now);
  const counterpartyName = extractCounterparty(text);

  return {
    amount: amount.amount,
    counterpartyName,
    currency: amount.currency,
    direction,
    dueAt: date.matched ? date.dueAt : null,
    note: cleanupResidualText(text, [amount.raw, date.matchedText, counterpartyName]),
  };
}
