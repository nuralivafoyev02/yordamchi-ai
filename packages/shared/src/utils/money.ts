import type { CurrencyCode } from '../domain/enums';

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatMoney(value: number, currency: CurrencyCode, locale = 'uz-UZ'): string {
  return new Intl.NumberFormat(locale, {
    currency,
    maximumFractionDigits: currency === 'UZS' ? 0 : 2,
    style: 'currency',
  }).format(value);
}
