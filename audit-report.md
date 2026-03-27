# Yordamchi AI Audit Report

## Scope
- Monorepo audit covered `apps/bot-worker`, `apps/miniapp`, `packages/shared`, and `supabase/migrations`.
- Focus areas: worker runtime safety, reminder delivery policy, parser quality, finance/limits UX, admin diagnostics, modal architecture, theme system, timezone flow, and env handling.

## Critical
- Fixed worker typecheck break in [apps/bot-worker/src/index.ts](/Users/admin/Desktop/PROJECTS/yordamchi-ai/apps/bot-worker/src/index.ts): `/telegram/webhook` command dispatch now matches `handleCommand(app, message)` signature.
- Implemented reminder delivery policy in [apps/bot-worker/src/jobs/reminder-policy.ts](/Users/admin/Desktop/PROJECTS/yordamchi-ai/apps/bot-worker/src/jobs/reminder-policy.ts) and [apps/bot-worker/src/jobs/reminder-dispatcher.ts](/Users/admin/Desktop/PROJECTS/yordamchi-ai/apps/bot-worker/src/jobs/reminder-dispatcher.ts):
  - respects `botNotificationsEnabled`
  - respects plan/debt/limit/subscription reminder toggles
  - reschedules reminders out of quiet hours instead of blindly sending
  - suppresses disabled reminders safely and logs the decision
- Removed Mini App session timezone hardcode:
  - [apps/miniapp/src/shared/lib/telegram.ts](/Users/admin/Desktop/PROJECTS/yordamchi-ai/apps/miniapp/src/shared/lib/telegram.ts)
  - [apps/miniapp/src/app/stores/session.ts](/Users/admin/Desktop/PROJECTS/yordamchi-ai/apps/miniapp/src/app/stores/session.ts)
  - [apps/bot-worker/src/api/routes.ts](/Users/admin/Desktop/PROJECTS/yordamchi-ai/apps/bot-worker/src/api/routes.ts)
- Reworked modal stack to be safer for Telegram Mini App constraints:
  - [apps/miniapp/src/shared/components/BaseModal.vue](/Users/admin/Desktop/PROJECTS/yordamchi-ai/apps/miniapp/src/shared/components/BaseModal.vue)
  - [apps/miniapp/src/features/calendar-entry/DayEntryModal.vue](/Users/admin/Desktop/PROJECTS/yordamchi-ai/apps/miniapp/src/features/calendar-entry/DayEntryModal.vue)

## Major
- Added full category limits flow:
  - backend CRUD/progress in [apps/bot-worker/src/domain/services/finance-service.ts](/Users/admin/Desktop/PROJECTS/yordamchi-ai/apps/bot-worker/src/domain/services/finance-service.ts)
  - API in [apps/bot-worker/src/api/routes.ts](/Users/admin/Desktop/PROJECTS/yordamchi-ai/apps/bot-worker/src/api/routes.ts)
  - Mini App UX in [apps/miniapp/src/pages/finance/FinancePage.vue](/Users/admin/Desktop/PROJECTS/yordamchi-ai/apps/miniapp/src/pages/finance/FinancePage.vue)
- Expanded admin panel from a counter view into a diagnostics surface:
  - [apps/bot-worker/src/domain/services/admin-service.ts](/Users/admin/Desktop/PROJECTS/yordamchi-ai/apps/bot-worker/src/domain/services/admin-service.ts)
  - [apps/miniapp/src/pages/admin/AdminPage.vue](/Users/admin/Desktop/PROJECTS/yordamchi-ai/apps/miniapp/src/pages/admin/AdminPage.vue)
  - Includes parser watchlist, reminder failures, premium users, quota insights, and recent user actions search.
- Strengthened parser rules in:
  - [packages/shared/src/parser/intent/parseIntent.ts](/Users/admin/Desktop/PROJECTS/yordamchi-ai/packages/shared/src/parser/intent/parseIntent.ts)
  - [packages/shared/src/parser/debt/parseDebt.ts](/Users/admin/Desktop/PROJECTS/yordamchi-ai/packages/shared/src/parser/debt/parseDebt.ts)
  - Added explicit handling for `Ali uchun 80 ming to'ladim`, `Ali 50 ming qaytardi`, and similar mixed-language phrases.
- Added parser/admin observability via bot logs in [apps/bot-worker/src/bot/handlers/text.ts](/Users/admin/Desktop/PROJECTS/yordamchi-ai/apps/bot-worker/src/bot/handlers/text.ts).

## Medium
- Expanded theme system beyond blue/gold with new tokenized themes in:
  - [packages/shared/src/domain/enums/index.ts](/Users/admin/Desktop/PROJECTS/yordamchi-ai/packages/shared/src/domain/enums/index.ts)
  - [apps/miniapp/src/shared/styles/tokens.css](/Users/admin/Desktop/PROJECTS/yordamchi-ai/apps/miniapp/src/shared/styles/tokens.css)
  - [apps/miniapp/src/features/profile-settings/ThemePicker.vue](/Users/admin/Desktop/PROJECTS/yordamchi-ai/apps/miniapp/src/features/profile-settings/ThemePicker.vue)
- Normalized bot callback timezone fallback away from `Asia/Tashkent` hardcode in [apps/bot-worker/src/bot/handlers/callbacks.ts](/Users/admin/Desktop/PROJECTS/yordamchi-ai/apps/bot-worker/src/bot/handlers/callbacks.ts).
- Tightened local secret hygiene with ignore patterns in [/.gitignore](/Users/admin/Desktop/PROJECTS/yordamchi-ai/.gitignore).

## Polish
- Finance page now has clearer hierarchy, alert surfaces, and lower-friction operations:
  - quick actions
  - limit editor
  - activity feed
  - debt payment sheet
- Admin console now uses the same compact product language as the rest of the Mini App.
- Shared translation catalog was extended in [packages/shared/src/i18n/messages.ts](/Users/admin/Desktop/PROJECTS/yordamchi-ai/packages/shared/src/i18n/messages.ts) to keep all new flows localized across `uz`, `en`, and `ru`.

## Remaining Risks
- Existing live reminders created before this release may still reflect older scheduling assumptions; new dispatch policy is safe, but old reminder payloads were not backfilled.
- Premium theme enforcement is still primarily UX-driven. If strict backend enforcement is required for all premium-only visual options, add a profile theme permission check on the worker patch route.
- Local secret files were found in the workspace:
  - [/.env](/Users/admin/Desktop/PROJECTS/yordamchi-ai/.env)
  - [apps/bot-worker/worker.secrets.env](/Users/admin/Desktop/PROJECTS/yordamchi-ai/apps/bot-worker/worker.secrets.env)
  - [apps/miniapp/.env.production](/Users/admin/Desktop/PROJECTS/yordamchi-ai/apps/miniapp/.env.production)
  If these files were ever shared outside the trusted environment, rotate the secrets immediately.

## Verification
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
