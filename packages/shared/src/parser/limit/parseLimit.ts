import type { AppLocale, CurrencyCode } from '../../domain/enums';
import type { ParsedCategoryLimit } from '../../domain/types';
import { startOfMonthIso } from '../../utils/date';
import { parseAmount } from '../amount/parseAmount';
import { detectCategorySlug } from '../normalizers/helpers';
import { normalizeText } from '../normalizers/normalizeText';

export function parseLimit(text: string, defaultCurrency: CurrencyCode, _locale: AppLocale, timeZone: string, now = new Date()): ParsedCategoryLimit | null {
  const normalized = normalizeText(text);
  const amount = parseAmount(normalized, defaultCurrency);

  if (!amount.amount || !amount.currency) {
    return null;
  }

  return {
    amount: amount.amount,
    categorySlug: detectCategorySlug(normalized, 'expense'),
    currency: amount.currency,
    monthStart: startOfMonthIso(now, timeZone),
  };
}
