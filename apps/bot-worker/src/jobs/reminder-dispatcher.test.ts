import { describe, expect, it } from 'vitest';
import { resolveReminderTitle } from './reminder-dispatcher';

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
});
