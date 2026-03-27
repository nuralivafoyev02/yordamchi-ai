# Release Notes

## Highlights
- Worker reminder delivery now respects notification settings and quiet hours.
- Finance tab now includes full category limits management with progress and warning states.
- Admin panel now surfaces parser issues, reminder failures, premium users, quota pressure, and recent user actions.
- Modal/bottom-sheet UX was rebuilt to behave better inside Telegram Mini App safe areas and above bottom navigation.
- Session bootstrap now uses resolved device/profile timezone instead of a hardcoded timezone.
- Theme system expanded with `graphite` and `mint`.

## Bot
- Fixed the webhook command handler signature mismatch that was breaking worker typecheck.
- Added parser logs for unknown and low-confidence messages.
- Improved parser intent handling for:
  - `dadamdan 50 ming oldim`
  - `Ali 100 ming qarz berdi`
  - `Ali uchun 80 ming to'ladim`
  - `Ali 50 ming qaytardi`

## Mini App
- Finance screen upgraded with:
  - limits list
  - limit create/edit/archive
  - limit threshold visualization
  - better debt payment flow
- Admin screen upgraded with diagnostics and search.
- Entry modal is now unified with the shared modal architecture.
- Theme picker now supports more polished accent options.

## Platform
- Added theme enum migration: [20260327210000_expand_theme_keys.sql](/Users/admin/Desktop/PROJECTS/yordamchi-ai/supabase/migrations/20260327210000_expand_theme_keys.sql)
- Added reminder policy tests and parser regression tests.

## Verified
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
