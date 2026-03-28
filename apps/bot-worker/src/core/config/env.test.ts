import { describe, expect, it } from 'vitest';
import { parseAdminTelegramIds } from './env';

describe('parseAdminTelegramIds', () => {
  it('supports both ADMIN_IDS and ADMIN_TELEGRAM_IDS', () => {
    const parsed = parseAdminTelegramIds({
      ADMIN_IDS: '101, 202',
      ADMIN_TELEGRAM_IDS: '202,invalid,303',
    });

    expect(Array.from(parsed).sort((left, right) => left - right)).toEqual([101, 202, 303]);
  });

  it('ignores empty or invalid values', () => {
    const parsed = parseAdminTelegramIds({
      ADMIN_IDS: ', ,0,-10,abc',
      ADMIN_TELEGRAM_IDS: undefined,
    });

    expect(parsed.size).toBe(0);
  });
});
