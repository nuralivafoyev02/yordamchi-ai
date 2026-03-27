import type { AppLocale } from '../../domain/enums';
import type { DateParseResult } from '../../domain/types';
import {
  addCalendarDays,
  endOfMonthParts,
  formatIsoDate,
  formatIsoTime,
  getWeekdayIndex,
  getZonedParts,
  makeDateInTimeZone,
} from '../../utils/date';
import { normalizeText } from '../normalizers/normalizeText';

const WEEKDAY_MAP: Record<string, number> = {
  dushanba: 1,
  monday: 1,
  понедельник: 1,
  seshanba: 2,
  tuesday: 2,
  вторник: 2,
  chorshanba: 3,
  wednesday: 3,
  среда: 3,
  payshanba: 4,
  thursday: 4,
  четверг: 4,
  juma: 5,
  friday: 5,
  пятница: 5,
  shanba: 6,
  saturday: 6,
  суббота: 6,
  yakshanba: 0,
  sunday: 0,
  воскресенье: 0,
};

const MONTH_MAP: Record<string, number> = {
  april: 4,
  aprel: 4,
  апрел: 4,
  august: 8,
  avgust: 8,
  август: 8,
  december: 12,
  dekabr: 12,
  декабр: 12,
  february: 2,
  феврал: 2,
  fevral: 2,
  january: 1,
  yanvar: 1,
  январ: 1,
  july: 7,
  iyul: 7,
  июл: 7,
  june: 6,
  iyun: 6,
  июн: 6,
  march: 3,
  март: 3,
  mart: 3,
  may: 5,
  maya: 5,
  май: 5,
  november: 11,
  ноябр: 11,
  noyabr: 11,
  october: 10,
  oktabr: 10,
  октябр: 10,
  september: 9,
  sentyabr: 9,
  сентябр: 9,
};

interface TimeHint {
  allDay: boolean;
  hour: number;
  matchedText: string | null;
  minute: number;
}

function parseTimeHint(text: string): TimeHint | null {
  const explicit = text.match(
    /\b(?:soat\s*(?<hour1>\d{1,2})(?::(?<minute1>\d{2}))?|(?<hour2>\d{1,2}):(?<minute2>\d{2})|(?<hour3>\d{1,2})\s*da|(?<hour4>\d{1,2})\s*(?<ampm>am|pm))\b/u,
  );
  const period =
    /\b(kechqurun|вечером|evening)\b/u.test(text)
      ? 'evening'
      : /\b(ertalab|утром|morning)\b/u.test(text)
        ? 'morning'
        : /\b(tushdan keyin|днем|afternoon)\b/u.test(text)
          ? 'afternoon'
          : null;

  const rawHour =
    explicit?.groups?.hour1 ??
    explicit?.groups?.hour2 ??
    explicit?.groups?.hour3 ??
    explicit?.groups?.hour4;

  const rawMinute = explicit?.groups?.minute1 ?? explicit?.groups?.minute2 ?? '0';

  if (rawHour) {
    let hour = Number(rawHour);
    const minute = Number(rawMinute);

    if (explicit?.groups?.ampm === 'pm' && hour < 12) {
      hour += 12;
    }

    if (explicit?.groups?.ampm === 'am' && hour === 12) {
      hour = 0;
    }

    if (period === 'evening' && hour < 12) {
      hour += 12;
    }

    if (period === 'afternoon' && hour < 12) {
      hour += 12;
    }

    return {
      allDay: false,
      hour,
      matchedText: explicit[0],
      minute,
    };
  }

  if (period === 'morning') {
    return { allDay: false, hour: 9, matchedText: period, minute: 0 };
  }

  if (period === 'afternoon') {
    return { allDay: false, hour: 14, matchedText: period, minute: 0 };
  }

  if (period === 'evening') {
    return { allDay: false, hour: 20, matchedText: period, minute: 0 };
  }

  return null;
}

function resolveRelativeDate(text: string, now: Date, timeZone: string) {
  const parts = getZonedParts(now, timeZone);

  const todayMatch = text.match(/\b(today|bugun|сегодня)\b/u);
  if (todayMatch) {
    return { matchedText: todayMatch[0], ...parts };
  }

  const tomorrowMatch = text.match(/\b(tomorrow|ertaga|завтра)\b/u);
  if (tomorrowMatch) {
    return { matchedText: tomorrowMatch[0], ...addCalendarDays(parts.year, parts.month, parts.day, 1) };
  }

  const afterTomorrowMatch = text.match(/\b(day after tomorrow|indin|послезавтра)\b/u);
  if (afterTomorrowMatch) {
    return { matchedText: afterTomorrowMatch[0], ...addCalendarDays(parts.year, parts.month, parts.day, 2) };
  }

  const endOfMonthMatch = text.match(/\b(oy oxirida|oy oxiri|end of month|конец месяца)\b/u);
  if (endOfMonthMatch) {
    return { matchedText: endOfMonthMatch[0], ...endOfMonthParts(parts.year, parts.month) };
  }

  return null;
}

function resolveExplicitDate(text: string, now: Date, timeZone: string) {
  const parts = getZonedParts(now, timeZone);
  const match = text.match(/\b(?<day>\d{1,2})[-./ ](?<month>[a-zA-Zа-яА-Я]+)\b/u);

  if (!match?.groups?.day || !match.groups.month) {
    return null;
  }

  const month = MONTH_MAP[match.groups.month.toLowerCase()];
  if (!month) {
    return null;
  }

  const day = Number(match.groups.day);
  let year = parts.year;

  if (month < parts.month || (month === parts.month && day < parts.day)) {
    year += 1;
  }

  return {
    day,
    matchedText: match[0],
    month,
    year,
  };
}

function resolveWeekday(text: string, now: Date, timeZone: string) {
  const parts = getZonedParts(now, timeZone);
  const nextWeek = /\b(next week|keyingi hafta|следующ)\b/u.test(text);
  const matchedKey = Object.keys(WEEKDAY_MAP).find((weekday) => text.includes(weekday));

  if (!matchedKey) {
    return null;
  }

  const targetWeekday = WEEKDAY_MAP[matchedKey];
  const currentWeekday = getWeekdayIndex(parts.year, parts.month, parts.day);
  let delta = (targetWeekday - currentWeekday + 7) % 7;

  if (delta === 0 || nextWeek) {
    delta += 7;
  }

  return {
    matchedText: matchedKey,
    ...addCalendarDays(parts.year, parts.month, parts.day, delta),
  };
}

export function parseDateExpression(input: string, _locale: AppLocale, timeZone: string, now = new Date()): DateParseResult {
  const text = normalizeText(input);
  const parts = getZonedParts(now, timeZone);
  const timeHint = parseTimeHint(text);
  const relative = resolveRelativeDate(text, now, timeZone);
  const explicit = resolveExplicitDate(text, now, timeZone);
  const weekday = resolveWeekday(text, now, timeZone);

  let year = parts.year;
  let month = parts.month;
  let day = parts.day;
  let matchedText: string | null = null;

  const dateSource = relative ?? explicit ?? weekday;
  if (dateSource) {
    year = dateSource.year;
    month = dateSource.month;
    day = dateSource.day;
    matchedText = dateSource.matchedText;
  } else if (!timeHint) {
    return {
      allDay: true,
      confidence: 0,
      date: null,
      dueAt: null,
      matched: false,
      matchedText: null,
      time: null,
    };
  }

  let hour = 9;
  let minute = 0;
  let allDay = true;

  if (timeHint) {
    allDay = false;
    hour = timeHint.hour;
    minute = timeHint.minute;
    matchedText = [matchedText, timeHint.matchedText].filter(Boolean).join(' ');

    if (!dateSource) {
      const currentMinutes = parts.hour * 60 + parts.minute;
      const candidateMinutes = hour * 60 + minute;

      if (candidateMinutes < currentMinutes) {
        const nextDay = addCalendarDays(parts.year, parts.month, parts.day, 1);
        year = nextDay.year;
        month = nextDay.month;
        day = nextDay.day;
      }
    }
  }

  const dueDate = makeDateInTimeZone(timeZone, year, month, day, hour, minute);

  return {
    allDay,
    confidence: dateSource ? 0.92 : 0.72,
    date: formatIsoDate(year, month, day),
    dueAt: dueDate.toISOString(),
    matched: true,
    matchedText,
    time: allDay ? null : formatIsoTime(hour, minute),
  };
}
