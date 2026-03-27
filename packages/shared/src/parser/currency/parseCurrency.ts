import type { CurrencyCode } from '../../domain/enums';

const USD_PATTERN = /(usd|dollar|dollars|бакс|доллар|доллара|долларов|dollor)|\$/iu;
const UZS_PATTERN = /(uzs|sum|so'm|som|сум|сумм)/iu;

export function parseCurrency(text: string, defaultCurrency: CurrencyCode = 'UZS'): CurrencyCode {
  if (USD_PATTERN.test(text)) {
    return 'USD';
  }

  if (UZS_PATTERN.test(text)) {
    return 'UZS';
  }

  return defaultCurrency;
}
