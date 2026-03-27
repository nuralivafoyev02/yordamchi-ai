# Migration Guide

## Order

Apply the SQL files in this order:

1. `20260327130000_init_types.sql`
2. `20260327130100_init_tables.sql`
3. `20260327130200_init_functions.sql`
4. `20260327130300_init_rls.sql`
5. `20260327130400_seed_system_data.sql`

## Notes

- types must exist before tables because the schema uses business enums heavily
- functions and triggers are separated from tables so you can reason about data model and business logic independently
- RLS runs after every table exists, which keeps policy creation deterministic
- seed data only adds system categories and starter exchange rates

## Safe Rollout Strategy

1. apply migrations in a staging Supabase project
2. verify default user bootstrap creates profiles, notification settings, and UZS/USD accounts
3. verify `subscription_snapshot`, `grant_premium_subscription`, and `claim_due_reminders` RPCs
4. only then apply to production

## Backward-Compatible Extension Rules

- add nullable columns first
- backfill data through a separate migration if needed
- only then add `not null` constraints or stricter checks
- for new indexes on hot tables, prefer `concurrently` outside transaction-managed migration runners
