import { describe, expect, it } from 'vitest';
import { resolvePlanReminderSchedule } from './plan-service';

describe('resolvePlanReminderSchedule', () => {
  it('defaults plan reminders to the due time when no offset is provided', () => {
    const now = new Date('2026-03-28T08:51:00.000Z');

    expect(resolvePlanReminderSchedule('2026-03-28T09:20:00.000Z', undefined, now)).toBe('2026-03-28T09:20:00.000Z');
  });

  it('falls back to the due time when the planned pre-reminder window is already in the past', () => {
    const now = new Date('2026-03-28T08:51:00.000Z');

    expect(resolvePlanReminderSchedule('2026-03-28T09:20:00.000Z', 60, now)).toBe('2026-03-28T09:20:00.000Z');
  });

  it('keeps explicit pre-reminders when they are still in the future', () => {
    const now = new Date('2026-03-28T07:30:00.000Z');

    expect(resolvePlanReminderSchedule('2026-03-28T09:20:00.000Z', 60, now)).toBe('2026-03-28T08:20:00.000Z');
  });

  it('returns null for plans that are already overdue', () => {
    const now = new Date('2026-03-28T09:21:00.000Z');

    expect(resolvePlanReminderSchedule('2026-03-28T09:20:00.000Z', 0, now)).toBeNull();
  });
});
