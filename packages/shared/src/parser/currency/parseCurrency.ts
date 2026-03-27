import type { CurrencyCode } from '../../domain/enums';

const USD_PATTERN = /\b(usd|dollar|dollars|бакс|доллар|dollor)\b|\$/iu;
const UZS_PATTERN = /\b(uzs|sum|so'm|som|сум|сумм)\b/iu;

export function parseCurrency(text: string, defaultCurrency: CurrencyCode = 'UZS'): CurrencyCode {
  if (USD_PATTERN.test(text)) {
    return 'USD';
  }

  if (UZS_PATTERN.test(text)) {
    return 'UZS';
  }

  return defaultCurrency;
}
