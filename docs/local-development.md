# Local Development Guide

## Requirements

- Node.js 22+
- pnpm 10+
- a Supabase project
- a Telegram bot token from BotFather
- Cloudflare account with Workers and Pages enabled

## Setup

1. Copy `.env.example` into environment files for the Worker and Mini App.
2. Run `pnpm install`.
3. Apply the SQL files in `supabase/migrations`.
4. Start the Worker with `pnpm dev:worker`.
5. Start the Mini App with `pnpm dev:miniapp`.

## Local Workflow

- use a tunnel for local Telegram webhook testing or deploy the Worker to a dev environment
- use the Mini App with Telegram test chats once the Worker session exchange endpoint is reachable
- run `pnpm test` for parser and integration checks

## Recommended Iteration Loop

1. update shared schema or parser
2. run unit tests
3. update Worker handlers or Mini App components
4. verify through the bot and Mini App
