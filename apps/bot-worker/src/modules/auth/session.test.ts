import { describe, expect, it } from 'vitest';
import { signAppSession, verifyAppSession } from './session';

describe('app session signing', () => {
  it('signs and verifies worker sessions', async () => {
    const session = await signAppSession('test-secret', {
      app_user_id: '00000000-0000-0000-0000-000000000001',
      locale: 'uz',
      phone_registered: true,
      role: 'admin',
      telegram_user_id: 12345,
      theme: 'blue',
    });

    const verified = await verifyAppSession('test-secret', session.token);

    expect(verified.app_user_id).toBe('00000000-0000-0000-0000-000000000001');
    expect(verified.phone_registered).toBe(true);
    expect(verified.role).toBe('admin');
    expect(verified.telegram_user_id).toBe(12345);
  });
});
