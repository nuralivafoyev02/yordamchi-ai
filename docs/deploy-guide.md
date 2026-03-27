# Deploy Guide

## Worker

1. create a Cloudflare Worker for the API and webhook runtime
2. configure all secrets from `.env.example`
3. deploy with `wrangler deploy`
4. set the Telegram webhook URL to `https://<worker-domain>/telegram/webhook`
5. configure the Worker cron schedule for reminder dispatch

## Mini App

1. create a Cloudflare Pages project
2. set the build command to `pnpm --filter @yordamchi/miniapp build`
3. set the output directory to `apps/miniapp/dist`
4. configure `VITE_API_BASE_URL` to the Worker domain
5. set the bot menu button or Web App URL to the Pages domain

## Supabase

1. create separate projects for staging and production
2. run the SQL migrations in order
3. store service role, anon key, and project URL in Cloudflare secrets
4. enable pgcrypto and pgjwt-compatible auth helpers available in Supabase

## Release Checklist

- webhook secret token configured
- Pages and Worker use the same environment set
- bot deep links point to the production Mini App
- admin users are seeded or elevated before launch
