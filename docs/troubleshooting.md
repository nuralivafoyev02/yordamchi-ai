# Troubleshooting Guide

## Bot does not answer

- verify Telegram webhook status and Worker logs
- confirm `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET` are correct
- inspect `bot_logs` for parse or send failures

## Mini App session exchange fails

- check Telegram `initData` verification inputs
- confirm Mini App URL domain matches the configured Telegram domain
- verify `APP_JWT_SECRET` and Worker environment variables

## Reminder duplicates or misses

- inspect `reminders` rows for `dedupe_key`, `status`, `lease_expires_at`, and `retry_count`
- verify Cloudflare cron is enabled and firing every minute
- inspect Worker logs for Telegram API errors

## Premium not applied

- check `subscriptions` for status and current period end
- verify the admin action created an `audit_logs` row
- refresh the session so the Worker can return new subscription state
