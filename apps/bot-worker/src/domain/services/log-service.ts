import type { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '../../core/logger/logger';

export class LogService {
  constructor(
    private readonly client: SupabaseClient,
    private readonly logger: Logger,
  ) {}

  async botLog(entry: {
    context?: Record<string, unknown>;
    event: string;
    level: 'info' | 'warn' | 'error' | 'audit';
    message: string;
    telegramUpdateId?: number;
    userId?: string;
  }) {
    this.logger[entry.level === 'audit' ? 'info' : entry.level](entry.message, {
      botEvent: entry.event,
      userId: entry.userId,
    });

    await this.client.from('bot_logs').insert({
      context: entry.context ?? {},
      event: entry.event,
      level: entry.level,
      message: entry.message,
      telegram_update_id: entry.telegramUpdateId,
      user_id: entry.userId,
    });
  }

  async audit(entry: {
    action: string;
    actorUserId?: string;
    entityId?: string;
    entityType: string;
    metadata?: Record<string, unknown>;
    subjectUserId?: string;
  }) {
    this.logger.info(`audit:${entry.action}`, {
      actorUserId: entry.actorUserId,
      entityId: entry.entityId,
      entityType: entry.entityType,
      subjectUserId: entry.subjectUserId,
    });

    await this.client.from('audit_logs').insert({
      action: entry.action,
      actor_user_id: entry.actorUserId,
      entity_id: entry.entityId,
      entity_type: entry.entityType,
      metadata: entry.metadata ?? {},
      subject_user_id: entry.subjectUserId,
    });
  }
}
