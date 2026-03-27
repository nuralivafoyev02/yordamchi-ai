# Yordamchi AI Technical Blueprint

## 1. Product Scope

Yordamchi AI is a Telegram-first personal assistant with a Mini App for richer workflows. The product supports:

- natural-language capture of plans, reminders, income, expenses, debts, and limits
- calendar-first planning UX inside Telegram Mini App
- UZS and USD wallets with immutable original-currency storage
- free and premium subscriptions with guarded feature access
- admin diagnostics, premium management, and auditability
- multilingual UX in Uzbek, English, and Russian

## 2. Architecture Overview

### Runtime Topology

1. Telegram sends updates to the Cloudflare Worker webhook endpoint.
2. The Worker routes updates into bot handlers and shared parser services.
3. The Mini App opens inside Telegram and exchanges `initData` for a signed app session through the Worker.
4. The Worker uses Supabase with service-role access for controlled writes and RPC calls.
5. Cloudflare Cron invokes the same Worker on schedule to claim and deliver reminder jobs.
6. Admin users access `/admin` in the Mini App and use protected admin endpoints to inspect logs and grant premium access.

### Why This Architecture

- Cloudflare Worker is the correct control-plane for Telegram because it combines webhook handling, API surface, and cron scheduling in one stateless runtime.
- Cloudflare Pages is the right host for the Mini App because the frontend is static, fast to cache, and independent from the Worker release cycle.
- Supabase Postgres remains the system of record for structured financial and reminder data while SQL RPCs handle the concurrency-critical jobs.
- A shared package keeps parsing, validation, enums, and translations aligned between bot and Mini App so behavior does not drift.

## 3. Service Boundaries

### `apps/bot-worker`

- Telegram webhook controller
- bot commands, callback handlers, fallback handlers
- session exchange endpoint for Mini App
- CRUD endpoints for plans, transactions, debts, limits, profile, admin
- scheduled reminder dispatcher
- structured logging and diagnostics

### `apps/miniapp`

- `home` tab: calendar, today summary, upcoming items
- `finance` tab: wallet balances, transaction feed, debt overview, category limits
- `profile` tab: account, notifications, premium, theme, support
- `admin` route: subscription management, delivery health, recent parser errors, usage insights

### `packages/shared`

- domain enums and zod schemas
- deterministic parser modules
- i18n dictionaries for UZ/EN/RU
- date, money, and formatting helpers

## 4. Core Domain Rules

### Plans

- plans support title, note, due date, optional due time, priority, status, repeat rule, and reminder offset
- recurring plans store the repeat rule, while individual reminders store concrete send jobs
- future changes should create audit events for all destructive plan mutations

### Finance

- original amount and original currency are immutable
- normalized values are optional and only used for reporting
- account balances are separated by currency and updated from transaction status
- scheduled finance entries are allowed and do not impact live balances until posted

### Debts

- debt direction is explicit: `borrowed` means the user owes someone, `lent` means someone owes the user
- debt payments are tracked independently and can be linked to a transaction for balance impact
- overdue status is derived from due date and unpaid residual amount

### Limits

- category limits are tracked per month and per currency
- limit warnings trigger at threshold percentage and on exceed
- limit notifications create reminders with dedupe keys so the same threshold is not sent twice

### Free vs Premium

- free tier: 3 plans per month, 30 finance entries per month
- premium tier: unlimited plan and finance entry creation
- premium-only capabilities: gold theme, debt management, category limits, advanced analytics, future features
- usage counts are append-only to prevent delete-and-bypass abuse

## 5. NLU Strategy

The project intentionally avoids depending on an external LLM for baseline reliability.

### Pipeline

1. normalize incoming text
2. detect amount and currency
3. detect date and reminder language
4. score intents using keywords, patterns, and extracted entities
5. run intent-specific entity extraction
6. decide:
   - confidence >= 0.78: execute or show a concise confirmation
   - confidence between 0.45 and 0.78: ask a smart clarification
   - confidence < 0.45: return a helpful fallback and suggested actions

### Supported Input Examples

- `ertaga 200 ming chiqim qilaman`
- `dadamdan 50 dollar oldim`
- `oylik uchun 3 million limit`
- `Ali 500 ming qarz berdi`
- `dushanba kuni uchrashuv`
- `10-aprelga soliq to'lovi`

### Future AI Adapter

`NluAdapter` is designed with a deterministic default implementation and an optional remote LLM adapter so a future API key can enhance parsing without breaking the product offline.

## 6. Security Model

- Mini App `initData` is validated server-side using Telegram HMAC verification
- Worker issues a short-lived signed app session JWT
- all API writes are validated with Zod
- admin routes require both a valid session and `role in ('admin', 'owner')`
- RLS is defined in Supabase for user-scoped access and future direct-client reads
- webhook validation uses the Telegram secret token header
- financial writes and premium grants create audit log records

## 7. Reminder and Scheduling Strategy

### Scheduler

- Cloudflare Cron triggers every minute
- scheduler claims due reminder rows through an RPC using `FOR UPDATE SKIP LOCKED`
- each reminder row carries a lease owner, lease expiry, retry counter, next retry time, and dedupe key
- failed sends are retried with capped exponential backoff

### Why This Design

- duplicate sends are prevented by the dedupe key plus leased processing
- failures are visible because reminder state is stored in Postgres instead of hidden in ephemeral memory
- a manual internal trigger endpoint can replay stuck jobs without redeploying

## 8. Database Design Principles

The schema follows Supabase/Postgres best practices:

- UUID primary keys for app entities
- explicit enum types for state-heavy business rules
- partial and composite indexes on user/time/status access paths
- append-only logs for auditability
- soft delete only where recovery matters; immutable finance rows are preferred
- trigger-based updated timestamps
- RPCs for concurrency-sensitive quota and reminder operations

## 9. Frontend Architecture

The Mini App uses a feature-oriented structure:

- `app`: router, providers, root stores, shell layout
- `pages`: route-level screens
- `widgets`: page-level composites
- `features`: user actions and forms
- `entities`: domain-specific UI and model helpers
- `shared`: base components, API client, styling tokens, utilities

### UI Principles

- mobile-first layouts for Telegram viewport constraints
- strong typography and spacing hierarchy
- token-based theming with `blue` and premium `gold`
- skeleton loaders and composed empty/error states
- no modal dead ends; every blocking state has a visible recovery action

## 10. Observability

- JSON structured logs from the Worker
- `bot_logs` for meaningful user-facing failures, parse misses, and delivery problems
- `audit_logs` for admin and billing actions
- health endpoint for uptime checks
- admin panel surfaces recent errors, failed reminder jobs, and premium actions

## 11. Deployment Strategy

### Environments

- local: developer machine + Supabase local or hosted dev project
- staging: separate Cloudflare Worker, Pages project, and Supabase project
- production: isolated secrets, webhook URL, bot token, and premium billing configuration

### Deployment Split

- Worker deploys via `wrangler deploy`
- Mini App deploys via Cloudflare Pages build command
- SQL migrations are applied through Supabase CLI or dashboard SQL editor

## 12. Acceptance Targets

The implementation is considered ready when:

- the bot can classify and store the core example messages correctly
- the Mini App exposes Home, Finance, Profile, and Admin flows
- premium access is enforced in both API and UI
- reminder delivery is idempotent
- parser and quota tests pass
- local development and deployment docs are complete
