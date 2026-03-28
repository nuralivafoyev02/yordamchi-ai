import { describe, expect, it } from 'vitest';
import { resolveQuickActionFromText } from '../handlers/quick-actions';
import { miniAppKeyboard } from '../keyboards/common';
import { confirmationMessage, openHintMessage, premiumMessage, reminderMessage, startMessage, successMessage } from './formatter';

describe('bot formatter', () => {
  it('shows raw user input and parsed plan details without HTML titles', () => {
    const message = confirmationMessage(
      'uz',
      {
        confidence: 0.7,
        intent: 'create_plan',
        locale: 'uz',
        normalizedText: 'bugun 15:30 da mirshod bilan meeting',
        plan: {
          dueAt: '2026-03-27T10:30:00.000Z',
          priority: 'medium',
          reminderOffsetMinutes: 60,
          repeatRule: 'none',
          scheduledDate: '2026-03-27',
          scheduledTime: '15:30',
          status: 'pending',
          title: 'Mirshod bilan meeting',
        },
        scores: [],
      },
      'bugun 15:30 da mirshod bilan meeting',
      'Asia/Tashkent',
    );

    expect(message).toContain('Siz yozdingiz:');
    expect(message).toContain('"bugun 15:30 da mirshod bilan meeting"');
    expect(message).toContain('Mirshod bilan meeting');
    expect(message).not.toContain('<b>');
  });

  it('puts quick actions into the reply keyboard and resolves their labels', () => {
    const keyboard = miniAppKeyboard('uz', 'https://example.com/app');
    const rows = keyboard.keyboard.map((row) => row.map((button) => button.text));

    expect(rows).toEqual([
      ['Bugungi rejalar', 'Qarzlar'],
      ["Qo'llanma", 'Premium'],
    ]);
    expect(resolveQuickActionFromText('uz', 'Bugungi rejalar')).toBe('today_plans');
    expect(resolveQuickActionFromText('uz', 'Qarzlar')).toBe('debts');
    expect(resolveQuickActionFromText('uz', "Qo'llanma")).toBe('guide');
    expect(resolveQuickActionFromText('uz', 'Premium')).toBe('premium');
  });

  it('formats reminder and success messages in a single readable flow', () => {
    const reminder = reminderMessage('uz', 'Eslatma', 'Mirshod bilan meeting yaqinlashdi');
    const success = successMessage(
      'uz',
      {
        confidence: 0.92,
        intent: 'create_plan',
        locale: 'uz',
        normalizedText: 'bugun 15:30 da mirshod bilan meeting',
        plan: {
          dueAt: '2026-03-27T10:30:00.000Z',
          priority: 'medium',
          reminderOffsetMinutes: 60,
          repeatRule: 'none',
          scheduledDate: '2026-03-27',
          scheduledTime: '15:30',
          status: 'pending',
          title: 'Mirshod bilan meeting',
        },
        scores: [],
      },
      'Asia/Tashkent',
    );

    expect(reminder).toBe('🛎 Eslatma: Mirshod bilan meeting yaqinlashdi');
    expect(success).toContain('✅ Reja saqlandi');
    expect(success).toContain('Men shunday tushundim:');
    expect(success).not.toContain('<b>');
  });

  it('returns short start and detailed premium helper messages', () => {
    expect(startMessage('uz')).toContain('Men shu yerdaman boshliq');
    expect(openHintMessage('uz')).toContain('Open');

    const premium = premiumMessage('uz', false);
    expect(premium).toContain("Narx: 14 999 so'm");
    expect(premium).toContain('@uyqur_nurali');
  });
});
