import type { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../../core/errors/app-error';

export interface PendingStatePayload {
  action: 'create_plan' | 'create_transaction' | 'create_debt' | 'set_limit';
  payload: Record<string, unknown>;
}

export class StateService {
  constructor(private readonly client: SupabaseClient) {}

  async get(userId: string) {
    const { data, error } = await this.client
      .from('user_states')
      .select('state_key, step_key, payload, expires_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new AppError('Failed to load state', 500, 'DATABASE_ERROR', { details: error });
    }

    if (data?.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
      await this.clear(userId);
      return null;
    }

    return data;
  }

  async setPendingConfirmation(userId: string, payload: PendingStatePayload) {
    const { error } = await this.client.from('user_states').upsert({
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      payload,
      state_key: 'awaiting_confirmation',
      step_key: 'confirm',
      user_id: userId,
    });

    if (error) {
      throw new AppError('Failed to save conversation state', 500, 'DATABASE_ERROR', { details: error });
    }
  }

  async setAwaitingPhone(userId: string) {
    const { error } = await this.client.from('user_states').upsert({
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      payload: {},
      state_key: 'awaiting_phone',
      step_key: 'share_contact',
      user_id: userId,
    });

    if (error) {
      throw new AppError('Failed to save phone registration state', 500, 'DATABASE_ERROR', { details: error });
    }
  }

  async clear(userId: string) {
    const { error } = await this.client.from('user_states').delete().eq('user_id', userId);

    if (error) {
      throw new AppError('Failed to clear conversation state', 500, 'DATABASE_ERROR', { details: error });
    }
  }
}
