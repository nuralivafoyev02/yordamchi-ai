# Yordamchi AI

Production-ready monorepo for a Telegram bot and Telegram Mini App that helps users manage plans, reminders, finance, debts, limits, and premium subscriptions.

## Stack

- Cloudflare Worker for Telegram webhook, API gateway, scheduler, and admin diagnostics
- Cloudflare Pages for the Vue 3 Mini App
- Supabase Postgres for data, SQL migrations, RPCs, and Row-Level Security
- Vue 3 + Vite + Vue Router + Pinia + TypeScript for the Mini App
- grammY + Hono + Zod for the Worker and bot runtime
- Shared domain, parser, and i18n modules in `packages/shared`

## Workspace Layout

- `apps/bot-worker`: Telegram bot, Worker API, cron scheduler, admin endpoints
- `apps/miniapp`: Telegram Mini App and admin UI
- `packages/shared`: shared types, parsers, validation schemas, translations, helpers
- `supabase/migrations`: production SQL migrations, triggers, RLS, and RPC functions
- `docs`: blueprint, setup, deploy, troubleshooting, testing
- `tests`: unit and integration tests

## Key Product Decisions

- The Worker acts as a backend-for-frontend so Telegram init data is verified once and never trusted blindly on the client.
- Financial records preserve original currency and amount at all times; normalized reporting is optional metadata.
- Quotas are tracked per month in `usage_counters`, so resets happen by month partition logic rather than destructive resets.
- Reminder delivery uses a lease-based scheduler with dedupe keys to prevent duplicate Telegram notifications.
- The bot uses a hybrid NLU pipeline: deterministic parser, intent scoring, entity extraction, confidence threshold, and graceful clarification prompts.

## Docs

- [Technical Blueprint](./docs/technical-blueprint.md)
- [Local Development Guide](./docs/local-development.md)
- [Deploy Guide](./docs/deploy-guide.md)
- [Troubleshooting Guide](./docs/troubleshooting.md)
- [Test Plan](./docs/test-plan.md)
- [Migration Guide](./docs/migration-guide.md)
- [Admin Operations](./docs/admin-operations.md)
- [Folder Structure](./docs/folder-structure.md)
- [Product Ready Checklist](./docs/product-ready-checklist.md)

## Quick Start

1. Copy `.env.example` to `.env` files for the Worker and Mini App.
2. Apply the SQL migrations in `supabase/migrations` to your Supabase project.
3. Run `pnpm install`.
4. Start the Worker and Mini App in separate terminals.
5. Point the Telegram webhook to the Worker URL and open the Mini App from the bot menu button.

The repository is structured so the project can move from local development to staging and production without rewriting the architecture.
