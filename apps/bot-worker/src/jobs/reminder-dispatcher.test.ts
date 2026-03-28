import { describe, expect, it } from 'vitest';
import { isStalePlanReminder, resolveReminderTitle } from './reminder-dispatcher';

describe('resolveReminderTitle', () => {
  it('re-localizes generic reminder titles to the current user locale', () => {
    expect(resolveReminderTitle('uz', 'Напоминание')).toBe('Eslatma');
    expect(resolveReminderTitle('en', 'Eslatma')).toBe('Reminder');
    expect(resolveReminderTitle('ru', 'Reminder')).toBe('Напоминание');
    expect(resolveReminderTitle('ru', null)).toBe('Напоминание');
  });

  it('keeps custom titles intact', () => {
    expect(resolveReminderTitle('uz', 'To‘lov vaqti yaqin')).toBe('To‘lov vaqti yaqin');
  });

  it('marks only overdue plan reminders as stale', () => {
    const now = new Date('2026-03-28T07:30:00.000Z');

    expect(isStalePlanReminder({
      reminder_kind: 'plan_due',
      scheduled_for: '2026-03-28T06:40:00.000Z',
    }, now)).toBe(true);

    expect(isStalePlanReminder({
      reminder_kind: 'plan_due',
      scheduled_for: '2026-03-28T07:10:00.000Z',
    }, now)).toBe(false);

    expect(isStalePlanReminder({
      reminder_kind: 'debt_due',
      scheduled_for: '2026-03-28T06:00:00.000Z',
    }, now)).toBe(false);
  });
});
