import { describe, expect, it } from 'vitest';
import { parseAmount } from './amount/parseAmount';
import { parseCommand } from './index';
import { parseDateExpression } from './date/parseDateExpression';

const FIXED_NOW = new Date('2026-03-27T07:00:00.000Z');

describe('parser primitives', () => {
  it('parses amount with uzbek multiplier', () => {
    const parsed = parseAmount('ertaga 200 ming chiqim qilaman');

    expect(parsed.amount).toBe(200_000);
    expect(parsed.currency).toBe('UZS');
  });

  it('parses relative uzbek dates', () => {
    expect(parseDateExpression('ertaga', 'uz', 'Asia/Tashkent', FIXED_NOW).date).toBe('2026-03-28');
    expect(parseDateExpression('indin', 'uz', 'Asia/Tashkent', FIXED_NOW).date).toBe('2026-03-29');
  });

  it('parses weekday, end of month, and explicit time', () => {
    expect(parseDateExpression('dushanba kuni uchrashuv', 'uz', 'Asia/Tashkent', FIXED_NOW).date).toBe('2026-03-30');
    expect(parseDateExpression('oy oxirida', 'uz', 'Asia/Tashkent', FIXED_NOW).date).toBe('2026-03-31');

    const todayAtFive = parseDateExpression('bugun soat 17:00', 'uz', 'Asia/Tashkent', FIXED_NOW);
    expect(todayAtFive.date).toBe('2026-03-27');
    expect(todayAtFive.time).toBe('17:00');
  });
});

describe('parser command flow', () => {
  it('classifies scheduled expense from natural language', () => {
    const parsed = parseCommand('ertaga 200 ming chiqim qilaman', {
      locale: 'uz',
      now: FIXED_NOW,
      timeZone: 'Asia/Tashkent',
    });

    expect(parsed.intent).toBe('create_expense');
    expect(parsed.transaction?.amount).toBe(200_000);
    expect(parsed.transaction?.status).toBe('scheduled');
  });

  it('classifies income correctly', () => {
    const parsed = parseCommand('dadamdan 50 dollar oldim', {
      locale: 'uz',
      now: FIXED_NOW,
      timeZone: 'Asia/Tashkent',
    });

    expect(parsed.intent).toBe('create_income');
    expect(parsed.transaction?.currency).toBe('USD');
    expect(parsed.transaction?.amount).toBe(50);
  });

  it('classifies debt and extracts counterparty', () => {
    const parsed = parseCommand('Ali 100 dollar qarz berdi', {
      locale: 'uz',
      now: FIXED_NOW,
      timeZone: 'Asia/Tashkent',
    });

    expect(parsed.intent).toBe('create_debt');
    expect(parsed.debt?.currency).toBe('USD');
    expect(parsed.debt?.amount).toBe(100);
    expect(parsed.debt?.direction).toBe('borrowed');
  });

  it('classifies limit setup', () => {
    const parsed = parseCommand('oylik uchun 3 million limit', {
      locale: 'uz',
      now: FIXED_NOW,
      timeZone: 'Asia/Tashkent',
    });

    expect(parsed.intent).toBe('set_limit');
    expect(parsed.limit?.amount).toBe(3_000_000);
  });
});
