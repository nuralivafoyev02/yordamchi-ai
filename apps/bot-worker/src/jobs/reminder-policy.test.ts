import { describe, expect, it } from 'vitest';
import type { NotificationSettingsSnapshot } from '@yordamchi/shared';
import { getNextReminderWindow, isWithinQuietHours, reminderSettingEnabled } from './reminder-policy';

const baseSettings: NotificationSettingsSnapshot = {
  botNotificationsEnabled: true,
  debtRemindersEnabled: true,
  limitRemindersEnabled: true,
  planRemindersEnabled: true,
  quietHoursFrom: null,
  quietHoursTo: null,
  subscriptionRemindersEnabled: true,
};

describe('reminder policy', () => {
  it('respects per-kind notification toggles', () => {
    expect(reminderSettingEnabled('plan_due', {
      ...baseSettings,
      planRemindersEnabled: false,
    })).toBe(false);

    expect(reminderSettingEnabled('debt_due', {
      ...baseSettings,
      debtRemindersEnabled: false,
    })).toBe(false);

    expect(reminderSettingEnabled('subscription_expiring', {
      ...baseSettings,
      subscriptionRemindersEnabled: false,
    })).toBe(false);
  });

  it('detects quiet hours across midnight and schedules the next allowed window', () => {
    const settings: NotificationSettingsSnapshot = {
      ...baseSettings,
      quietHoursFrom: '22:00',
      quietHoursTo: '08:00',
    };
    const blockedAt = new Date('2026-03-27T18:30:00.000Z');

    expect(isWithinQuietHours(blockedAt, 'Asia/Tashkent', settings)).toBe(true);
    expect(getNextReminderWindow(blockedAt, 'Asia/Tashkent', settings).toISOString()).toBe('2026-03-28T03:00:00.000Z');
  });

  it('detects daytime quiet hours and releases reminders later the same day', () => {
    const settings: NotificationSettingsSnapshot = {
      ...baseSettings,
      quietHoursFrom: '13:00',
      quietHoursTo: '14:00',
    };
    const blockedAt = new Date('2026-03-27T08:15:00.000Z');

    expect(isWithinQuietHours(blockedAt, 'Asia/Tashkent', settings)).toBe(true);
    expect(getNextReminderWindow(blockedAt, 'Asia/Tashkent', settings).toISOString()).toBe('2026-03-27T09:00:00.000Z');
  });
});
