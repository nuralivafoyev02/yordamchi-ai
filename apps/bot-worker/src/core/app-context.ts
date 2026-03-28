import { RuleBasedNluAdapter } from '@yordamchi/shared';
import type { EnvBindings } from './config/env';
import { Logger } from './logger/logger';
import { TelegramClient } from './telegram/client';
import { createServiceClient } from '../lib/supabase';
import { AdminService } from '../domain/services/admin-service';
import { FinanceService } from '../domain/services/finance-service';
import { LogService } from '../domain/services/log-service';
import { PlanService } from '../domain/services/plan-service';
import { QuotaService } from '../domain/services/quota-service';
import { ReminderService } from '../domain/services/reminder-service';
import { StateService } from '../domain/services/state-service';
import { UserService } from '../domain/services/user-service';

export function buildAppContext(env: EnvBindings, requestId: string) {
  const logger = new Logger({ requestId, scope: 'worker' });
  const supabase = createServiceClient(env);
  const reminderService = new ReminderService(supabase, env);
  const telegram = new TelegramClient(env);

  return {
    adminService: new AdminService(supabase),
    env,
    financeService: new FinanceService(supabase, reminderService, env),
    logService: new LogService(supabase, logger, telegram, env),
    logger,
    nlu: new RuleBasedNluAdapter(),
    planService: new PlanService(supabase, reminderService, env),
    quotaService: new QuotaService(supabase),
    reminderService,
    stateService: new StateService(supabase),
    supabase,
    telegram,
    userService: new UserService(supabase, logger, env),
  };
}

export type AppContext = ReturnType<typeof buildAppContext>;
