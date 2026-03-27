import type { TransactionDirection } from '../../domain/enums';
import { normalizeText } from './normalizeText';

const CATEGORY_KEYWORDS: Record<TransactionDirection, Record<string, string[]>> = {
  expense: {
    education: ['education', 'ta\'lim', 'oqish', 'study', 'course', 'kurs', 'обучение', 'учеба'],
    entertainment: ['kino', 'film', 'concert', 'fun', 'entertainment', 'развлечение', 'ko\'ngil'],
    food: ['food', 'ovqat', 'cafe', 'restoran', 'restaurant', 'еда', 'yemak'],
    general: ['expense', 'chiqim', 'расход', 'расходы', 'xarajat', 'spent', 'sarf', 'потратил'],
    health: ['health', 'doctor', 'dori', 'medicine', 'sog\'liq', 'здоровье', 'аптека'],
    shopping: ['shopping', 'xarid', 'магазин', 'pokupka', 'buy', 'купил'],
    tax: ['tax', 'soliq', 'налог'],
    transport: ['taxi', 'metro', 'bus', 'transport', 'машина', 'transport', 'yo\'l'],
    utilities: ['kommunal', 'electricity', 'gas', 'utility', 'komunal', 'свет', 'газ', 'internet'],
  },
  income: {
    bonus: ['bonus', 'premiya', 'премия', 'reward'],
    general: ['income', 'kirim', 'доход', 'received', 'oldim', 'earn', 'earned', 'получил', 'получила', 'поступило'],
    gift: ['gift', 'sovg\'a', 'подарок'],
    salary: ['salary', 'maosh', 'oylik', 'зарплата', 'зарплату', 'ish haqi'],
  },
};

const FILLER_WORDS = [
  'bugun',
  'ertaga',
  'indin',
  'today',
  'tomorrow',
  'next',
  'week',
  'hafta',
  'kuni',
  'kuni',
  'na',
  'ga',
  'uchun',
  'for',
  'limit',
  'лимит',
  'qarz',
  'debt',
  'долг',
  'income',
  'expense',
  'chiqim',
  'kirim',
  'доход',
  'расход',
];

export function detectCategorySlug(text: string, direction: TransactionDirection): string {
  const normalized = normalizeText(text);
  const categories = CATEGORY_KEYWORDS[direction];

  for (const [slug, keywords] of Object.entries(categories)) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return slug;
    }
  }

  return 'general';
}

export function cleanupResidualText(text: string, fragments: Array<string | null | undefined> = []): string {
  let result = normalizeText(text);

  for (const fragment of fragments) {
    if (!fragment) {
      continue;
    }

    result = result.replace(fragment.toLowerCase(), ' ');
  }

  for (const word of FILLER_WORDS) {
    result = result.replace(new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), ' ');
  }

  return result.replace(/\s+/g, ' ').trim();
}

export function humanizeTitle(text: string, fallback: string): string {
  const value = text.trim();
  if (!value) {
    return fallback;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}
