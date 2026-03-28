import type { SupabaseClient } from '@supabase/supabase-js';
import type { CreatePlanInput } from '@yordamchi/shared';
import { t } from '@yordamchi/shared';
import { AppError } from '../../core/errors/app-error';
import type { EnvBindings } from '../../core/config/env';
import { ReminderService } from './reminder-service';

const DEFAULT_PLAN_REMINDER_OFFSET_MINUTES = 0;

export function resolvePlanReminderSchedule(
  dueAtIso: string,
  reminderOffsetMinutes?: number | null,
  now = new Date(),
) {
  const dueAt = new Date(dueAtIso);

  if (Number.isNaN(dueAt.getTime()) || dueAt.getTime() <= now.getTime()) {
    return null;
  }

  const offsetMinutes = Math.max(0, reminderOffsetMinutes ?? DEFAULT_PLAN_REMINDER_OFFSET_MINUTES);
  const scheduledAt = new Date(dueAt.getTime() - offsetMinutes * 60 * 1000);

  if (scheduledAt.getTime() > now.getTime()) {
    return scheduledAt.toISOString();
  }

  return dueAt.toISOString();
}

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
        reminder_offset_minutes: input.reminderOffsetMinutes ?? DEFAULT_PLAN_REMINDER_OFFSET_MINUTES,
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

    const reminderAt = resolvePlanReminderSchedule(data.due_at, data.reminder_offset_minutes);
    if (reminderAt) {
      await this.reminderService.enqueue({
        actionLabel: t(locale, 'common.openMiniApp'),
        body: data.title,
        dedupeKey: `plan:${data.id}:${reminderAt}`,
        deepLink: `${this.env.TELEGRAM_MINIAPP_URL}?tab=home`,
        entityId: data.id,
        entityType: 'plan',
        kind: 'plan_due',
        scheduledFor: reminderAt,
        title: t(locale, 'bot.reminderDue'),
        userId,
      });
    }

    return data;
  }
}
