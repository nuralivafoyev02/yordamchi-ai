import type { SupabaseClient } from '@supabase/supabase-js';
import type { EnvBindings } from '../../core/config/env';
import { parseTelegramLogChannelId } from '../../core/config/env';
import { Logger } from '../../core/logger/logger';
import { TelegramClient } from '../../core/telegram/client';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function truncateForTelegram(value: string, maxLength: number) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 20)}\n...truncated...`;
}

export class LogService {
  private readonly logChannelId: number;

  constructor(
    private readonly client: SupabaseClient,
    private readonly logger: Logger,
    private readonly telegram: TelegramClient,
    env: Pick<EnvBindings, 'TELEGRAM_LOG_CHANNEL_ID'>,
  ) {
    this.logChannelId = parseTelegramLogChannelId(env);
  }

  async botLog(entry: {
    channelLevel?: 'ERROR' | 'INFO' | 'SUCCESS';
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

    await this.sendChannelLog(entry);
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

  private async sendChannelLog(entry: {
    channelLevel?: 'ERROR' | 'INFO' | 'SUCCESS';
    context?: Record<string, unknown>;
    event: string;
    level: 'info' | 'warn' | 'error' | 'audit';
    message: string;
    telegramUpdateId?: number;
    userId?: string;
  }) {
    const payload = {
      level: entry.channelLevel ?? (entry.level === 'error' ? 'ERROR' : 'INFO'),
      dbLevel: entry.level,
      event: entry.event,
      message: entry.message,
      userId: entry.userId ?? null,
      telegramUpdateId: entry.telegramUpdateId ?? null,
      context: entry.context ?? {},
      timestamp: new Date().toISOString(),
    };

    try {
      const prettyJson = truncateForTelegram(JSON.stringify(payload, null, 2), 3500);
      await this.telegram.sendMessage(this.logChannelId, `<pre>${escapeHtml(prettyJson)}</pre>`, {
        parse_mode: 'HTML',
      });
    } catch (error) {
      this.logger.warn('telegram_channel_log_failed', {
        error: error instanceof Error ? error.message : 'Unknown channel log error',
        event: entry.event,
      });
    }
  }
}
