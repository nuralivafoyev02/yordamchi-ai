# Product-Ready Checklist

## Architecture

- [x] Cloudflare Worker handles webhook, API, scheduler, and admin endpoints
- [x] Vue 3 Mini App separated into feature-oriented modules
- [x] Shared parser, schemas, enums, and i18n package exists

## Database

- [x] UUID primary keys, business enums, constraints, and indexed foreign keys
- [x] RLS policies defined for user-scoped data
- [x] Reminder leasing RPCs for idempotent dispatch
- [x] Premium grant RPC and audit logging

## Bot

- [x] command, text, and callback handlers
- [x] fallback responses for low-confidence parsing and runtime failures
- [x] pending confirmation state flow
- [x] structured bot logs and audit events

## Mini App

- [x] Home, Finance, Profile, and Admin routes
- [x] token-based blue and gold theme system
- [x] calendar grid with day drawer and quick-entry modal
- [x] premium-aware theme selector and upsell blocks

## Operations

- [x] `.env.example`
- [x] deploy, local dev, troubleshooting, migration, and admin docs
- [x] CI workflow scaffold
- [x] parser and session tests

## Before Launch

- [ ] apply migrations to staging and production
- [ ] set Telegram webhook URL and secret token
- [ ] configure Cloudflare secrets and Pages environment variables
- [ ] verify admin accounts exist and can grant premium
- [ ] run end-to-end QA in real Telegram clients
