import type { SupabaseClient } from '@supabase/supabase-js';
import type { CreatePlanInput } from '@yordamchi/shared';
import { t } from '@yordamchi/shared';
import { AppError } from '../../core/errors/app-error';
import type { EnvBindings } from '../../core/config/env';
import { ReminderService } from './reminder-service';

export class PlanService {
  constructor(
    private readonly client: SupabaseClient,
    private readonly reminderService: ReminderService,
    private readonly env: EnvBindings,
  ) {}

  async create(userId: string, locale: 'uz' | 'en' | 'ru', input: CreatePlanInput) {
    const { data, error } = await this.client
      .from('plans')
      .insert({
        created_via: 'bot',
        description: input.description ?? null,
        due_at: input.dueAt,
        parser_confidence: input.parserConfidence ?? null,
        priority: input.priority ?? 'medium',
        reminder_offset_minutes: input.reminderOffsetMinutes ?? 60,
        repeat_rule: input.repeatRule ?? 'none',
        scheduled_date: input.scheduledDate,
        scheduled_time: input.scheduledTime ?? null,
        source_language: locale,
        source_text: input.sourceText ?? null,
        status: input.status ?? 'pending',
        timezone: input.timezone,
        title: input.title,
        user_id: userId,
      })
      .select('id, title, due_at, reminder_offset_minutes')
      .single();

    if (error || !data) {
      throw new AppError('Failed to create plan', 500, 'DATABASE_ERROR', { details: error });
    }

    const reminderAt = new Date(new Date(data.due_at).getTime() - (data.reminder_offset_minutes ?? 60) * 60 * 1000);
    if (reminderAt.getTime() > Date.now()) {
      await this.reminderService.enqueue({
        actionLabel: t(locale, 'common.openMiniApp'),
        body: data.title,
        dedupeKey: `plan:${data.id}:${reminderAt.toISOString()}`,
        deepLink: `${this.env.TELEGRAM_MINIAPP_URL}?tab=home`,
        entityId: data.id,
        entityType: 'plan',
        kind: 'plan_due',
        scheduledFor: reminderAt.toISOString(),
        title: t(locale, 'bot.reminderDue'),
        userId,
      });
    }

    return data;
  }
}
