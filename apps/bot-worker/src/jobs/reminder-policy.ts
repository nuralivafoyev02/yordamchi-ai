import type { NotificationSettingsSnapshot, ReminderKind } from '@yordamchi/shared';

const MINUTES_IN_DAY = 24 * 60;

function parseClock(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const [, hourString, minuteString] = match;
  const hour = Number(hourString);
  const minute = Number(minuteString);

  if (hour > 23 || minute > 59) {
    return null;
  }

  return hour * 60 + minute;
}

function getTimeZoneParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    month: '2-digit',
    second: '2-digit',
    timeZone,
    year: 'numeric',
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );

  return {
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    month: Number(parts.month),
    second: Number(parts.second),
    year: Number(parts.year),
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = getTimeZoneParts(date, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - date.getTime();
}

function zonedTimeToUtc(
  timeZone: string,
  input: { year: number; month: number; day: number; hour: number; minute: number },
) {
  const guess = Date.UTC(input.year, input.month - 1, input.day, input.hour, input.minute, 0);
  const guessDate = new Date(guess);
  const offset = getTimeZoneOffsetMs(guessDate, timeZone);
  const resolved = new Date(guess - offset);
  const adjustedOffset = getTimeZoneOffsetMs(resolved, timeZone);

  if (adjustedOffset === offset) {
    return resolved;
  }

  return new Date(guess - adjustedOffset);
}

export function reminderSettingEnabled(kind: ReminderKind, settings: NotificationSettingsSnapshot) {
  if (!settings.botNotificationsEnabled) {
    return false;
  }

  switch (kind) {
    case 'plan_due':
    case 'transaction_due':
      return settings.planRemindersEnabled;
    case 'debt_due':
      return settings.debtRemindersEnabled;
    case 'limit_warning':
    case 'limit_exceeded':
      return settings.limitRemindersEnabled;
    case 'subscription_expiring':
      return settings.subscriptionRemindersEnabled;
    default:
      return true;
  }
}

export function isWithinQuietHours(date: Date, timeZone: string, settings: NotificationSettingsSnapshot) {
  const quietFrom = parseClock(settings.quietHoursFrom);
  const quietTo = parseClock(settings.quietHoursTo);

  if (quietFrom === null || quietTo === null || quietFrom === quietTo) {
    return false;
  }

  const local = getTimeZoneParts(date, timeZone);
  const localMinutes = local.hour * 60 + local.minute;

  if (quietFrom < quietTo) {
    return localMinutes >= quietFrom && localMinutes < quietTo;
  }

  return localMinutes >= quietFrom || localMinutes < quietTo;
}

export function getNextReminderWindow(date: Date, timeZone: string, settings: NotificationSettingsSnapshot) {
  const quietFrom = parseClock(settings.quietHoursFrom);
  const quietTo = parseClock(settings.quietHoursTo);

  if (quietFrom === null || quietTo === null || quietFrom === quietTo) {
    return date;
  }

  const local = getTimeZoneParts(date, timeZone);
  const localMinutes = local.hour * 60 + local.minute;
  const crossesMidnight = quietFrom > quietTo;

  if (!isWithinQuietHours(date, timeZone, settings)) {
    return date;
  }

  const needsNextDay = (!crossesMidnight && localMinutes >= quietTo)
    || (crossesMidnight && localMinutes >= quietFrom)
    || quietTo <= localMinutes;

  const nextDayUtc = zonedTimeToUtc(timeZone, {
    day: local.day + (needsNextDay ? 1 : 0),
    hour: Math.floor(quietTo / 60),
    minute: quietTo % 60,
    month: local.month,
    year: local.year,
  });

  if (nextDayUtc.getTime() > date.getTime()) {
    return nextDayUtc;
  }

  return new Date(nextDayUtc.getTime() + MINUTES_IN_DAY * 60_000);
}
