import type { ReminderParseResult } from '../../domain/types';
import { normalizeText } from '../normalizers/normalizeText';

const MINUTE_WORDS = ['min', 'minute', 'минут', 'daqiqa'];
const HOUR_WORDS = ['hour', 'soat', 'час'];

export function parseReminder(text: string): ReminderParseResult {
  const normalized = normalizeText(text);
  const explicitMatch = normalized.match(/\b(\d+)\s*(min|minute|minutes|daqiqa|минут[аы]?|soat|hour|hours|час[аов]?)\s*(oldin|before|до)\b/u);

  if (explicitMatch) {
    const value = Number(explicitMatch[1]);
    const unit = explicitMatch[2] ?? '';
    const offsetMinutes = MINUTE_WORDS.some((word) => unit.startsWith(word))
      ? value
      : HOUR_WORDS.some((word) => unit.startsWith(word))
        ? value * 60
        : null;

    return {
      explicit: true,
      offsetMinutes,
    };
  }

  if (/\b(eslat|remind|напомни)\b/u.test(normalized)) {
    return {
      explicit: false,
      offsetMinutes: 60,
    };
  }

  return {
    explicit: false,
    offsetMinutes: null,
  };
}
