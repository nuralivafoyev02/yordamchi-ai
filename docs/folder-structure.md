# Folder Structure

```text
yordamchi-ai/
├── apps/
│   ├── bot-worker/
│   │   ├── src/
│   │   │   ├── api/
│   │   │   ├── bot/
│   │   │   ├── core/
│   │   │   ├── domain/
│   │   │   ├── jobs/
│   │   │   └── modules/
│   │   ├── package.json
│   │   └── wrangler.toml
│   └── miniapp/
│       ├── src/
│       │   ├── app/
│       │   ├── entities/
│       │   ├── features/
│       │   ├── pages/
│       │   ├── shared/
│       │   └── widgets/
│       ├── index.html
│       └── package.json
├── docs/
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── config/
│       │   ├── domain/
│       │   ├── i18n/
│       │   ├── parser/
│       │   ├── services/
│       │   └── utils/
│       └── package.json
├── supabase/
│   ├── migrations/
│   └── seed/
├── tests/
├── .env.example
├── package.json
└── pnpm-workspace.yaml
```

## Why This Layout

- `apps` contains deployable surfaces with their own scripts and runtime constraints
- `packages/shared` prevents domain drift between bot and Mini App
- `supabase/migrations` keeps the database contract versioned and reviewable
- `docs` keeps deployment, admin, and migration knowledge in-repo
