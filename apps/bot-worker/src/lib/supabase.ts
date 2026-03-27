import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { EnvBindings } from '../core/config/env';

export function createServiceClient(env: EnvBindings): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
    },
  });
}
