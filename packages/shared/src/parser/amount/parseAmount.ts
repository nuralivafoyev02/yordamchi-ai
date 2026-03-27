import type { CurrencyCode } from '../../domain/enums';
import type { AmountParseResult } from '../../domain/types';
import { roundMoney } from '../../utils/money';
import { parseCurrency } from '../currency/parseCurrency';

const MULTIPLIERS: Record<string, number> = {
  k: 1_000,
  million: 1_000_000,
  milliona: 1_000_000,
  ming: 1_000,
  mln: 1_000_000,
  m: 1_000_000,
  thousand: 1_000,
  тыс: 1_000,
  тысяч: 1_000,
  тысячи: 1_000,
  тысяча: 1_000,
  миллион: 1_000_000,
};

const AMOUNT_PATTERN =
  /(?<value>\d{1,3}(?:[ .]\d{3})+|\d+(?:[.,]\d+)?)(?:\s*(?<multiplier>ming|thousand|тыс|тысяч|тысячи|тысяча|milliona|million|миллион|mln|k|m))?/iu;

function parseNumeric(raw: string): number {
  const normalized = raw.replace(/ /g, '').replace(',', '.');
  return Number(normalized);
}

export function parseAmount(text: string, defaultCurrency: CurrencyCode = 'UZS'): AmountParseResult {
  const source = text.replace(/\b\d{1,2}:\d{2}\b/g, ' ');
  const match = source.match(AMOUNT_PATTERN);

  if (!match?.groups?.value) {
    return {
      amount: null,
      confidence: 0,
      currency: null,
      multiplier: 1,
      raw: null,
    };
  }

  const rawValue = match.groups.value;
  const multiplierKey = match.groups.multiplier?.toLowerCase() ?? '';
  const multiplier = MULTIPLIERS[multiplierKey] ?? 1;
  const amount = roundMoney(parseNumeric(rawValue) * multiplier);

  return {
    amount,
    confidence: amount > 0 ? 0.92 : 0,
    currency: parseCurrency(text, defaultCurrency),
    multiplier,
    raw: match[0],
  };
}
