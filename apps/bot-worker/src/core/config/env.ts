export interface EnvBindings {
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

export function readEnv(env: EnvBindings): EnvBindings {
  return env;
}
