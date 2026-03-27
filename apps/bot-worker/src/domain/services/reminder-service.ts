import type { SupabaseClient } from '@supabase/supabase-js';
import type { ReminderKind } from '@yordamchi/shared';
import { AppError } from '../../core/errors/app-error';
import type { EnvBindings } from '../../core/config/env';

interface EnqueueReminderInput {
  actionLabel?: string;
  body: string;
  dedupeKey: string;
  deepLink?: string;
  entityId?: string;
  entityType: string;
  kind: ReminderKind;
  scheduledFor: string;
  title: string;
  userId: string;
}

export class ReminderService {
  constructor(
    private readonly client: SupabaseClient,
    private readonly env: EnvBindings,
  ) {}

  async enqueue(input: EnqueueReminderInput) {
    const { error } = await this.client.from('reminders').insert({
      action_label: input.actionLabel ?? 'Open Mini App',
      body: input.body,
      channel: 'telegram',
      dedupe_key: input.dedupeKey,
      deep_link: input.deepLink ?? this.env.TELEGRAM_MINIAPP_URL,
      entity_id: input.entityId ?? null,
      entity_type: input.entityType,
      reminder_kind: input.kind,
      scheduled_for: input.scheduledFor,
      title: input.title,
      user_id: input.userId,
    });

    if (error && error.code !== '23505') {
      throw new AppError('Failed to enqueue reminder', 500, 'DATABASE_ERROR', { details: error });
    }
  }

  async claimBatch(workerId: string, batchSize = 50) {
    const { data, error } = await this.client.rpc('claim_due_reminders', {
      p_batch_size: batchSize,
      p_lease_owner: workerId,
    });

    if (error) {
      throw new AppError('Failed to claim reminders', 500, 'DATABASE_ERROR', { details: error });
    }

    return data ?? [];
  }

  async markSent(reminderId: string) {
    const { error } = await this.client.rpc('mark_reminder_sent', {
      p_reminder_id: reminderId,
    });

    if (error) {
      throw new AppError('Failed to mark reminder sent', 500, 'DATABASE_ERROR', { details: error });
    }
  }

  async markFailed(reminderId: string, message: string) {
    const { error } = await this.client.rpc('mark_reminder_failed', {
      p_error: message,
      p_reminder_id: reminderId,
    });

    if (error) {
      throw new AppError('Failed to mark reminder failed', 500, 'DATABASE_ERROR', { details: error });
    }
  }
}
