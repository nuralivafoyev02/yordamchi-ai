export interface EnvBindings {
  ADMIN_IDS?: string;
  ADMIN_TELEGRAM_IDS?: string;
  APP_ENV: 'development' | 'staging' | 'production';
  APP_JWT_SECRET: string;
  INTERNAL_JOB_SECRET: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_URL: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_MINIAPP_URL: string;
  TELEGRAM_WEBHOOK_SECRET: string;
}

export interface RequestEnv {
  env: EnvBindings;
}

export function parseAdminTelegramIds(env: Pick<EnvBindings, 'ADMIN_IDS' | 'ADMIN_TELEGRAM_IDS'>) {
  return new Set(
    [env.ADMIN_IDS, env.ADMIN_TELEGRAM_IDS]
      .filter(Boolean)
      .flatMap((value) => String(value).split(','))
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value > 0),
  );
}

export function readEnv(env: EnvBindings): EnvBindings {
  return env;
}
