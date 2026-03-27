import type { PostgrestSingleResponse, SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../core/errors/app-error';

export function assertSupabaseSingle<T>(response: PostgrestSingleResponse<T>, fallbackMessage: string): T {
  if (response.error || !response.data) {
    throw new AppError(fallbackMessage, 500, 'DATABASE_ERROR', {
      details: response.error,
    });
  }

  return response.data;
}

export function assertSupabaseSuccess(
  response: { error: unknown | null },
  fallbackMessage: string,
) {
  if (response.error) {
    throw new AppError(fallbackMessage, 500, 'DATABASE_ERROR', {
      details: response.error,
    });
  }
}

export async function findCurrentMonthUsage(
  client: SupabaseClient,
  userId: string,
  metric: string,
  usageMonth: string,
) {
  const { data, error } = await client
    .from('usage_counters')
    .select('used_count')
    .eq('user_id', userId)
    .eq('metric', metric)
    .eq('usage_month', usageMonth)
    .maybeSingle();

  if (error) {
    throw new AppError('Failed to load usage counters', 500, 'DATABASE_ERROR', { details: error });
  }

  return data?.used_count ?? 0;
}
