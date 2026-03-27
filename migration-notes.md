# Migration Notes

## Required Migration
- Apply [20260327210000_expand_theme_keys.sql](/Users/admin/Desktop/PROJECTS/yordamchi-ai/supabase/migrations/20260327210000_expand_theme_keys.sql) before allowing users to persist the new `graphite` and `mint` themes.

## Why
- The application enum layer now supports:
  - `blue`
  - `gold`
  - `graphite`
  - `mint`
- Supabase `theme_key` must be expanded first, otherwise profile updates for the new theme values will fail.

## Suggested Rollout
1. Apply the migration in staging.
2. Verify profile theme updates and Mini App bootstrap.
3. Apply the migration in production.
4. Redeploy Worker and Mini App if not already using the new build.

## Reminder
- Secret hygiene was improved via `.gitignore`, but existing local secret files were not modified automatically. If any env bundle was ever shared externally, rotate those secrets separately.
