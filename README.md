# Letravail Scraper

Production-grade Moroccan jobs scraping system built with TypeScript, Playwright, PostgreSQL, Prisma, BullMQ, and Pino.

## Features

- Plugin-based scraper architecture (`BaseScraper`)
- Shared Chromium browser with page pooling
- Exponential backoff retries (1s → 3s → 10s, max 3 attempts)
- Concurrent scraping (`MAX_CONCURRENT_SOURCES=5`) via `Promise.allSettled`
- SHA-256 deduplication across all sources
- BullMQ category queues with independent workers
- Cron scheduler (6h + daily sources)
- Structured Pino logging

## Quick Start

```bash
cp .env.example .env
docker compose up -d
npm install
npx playwright install chromium
npm run db:push
npm run scrape -- scrape attijariwafa-bank
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run scrape -- scrape --all` | Scrape all sources directly |
| `npm run scrape -- scrape banks` | Scrape a category |
| `npm run scrape -- scrape attijariwafa-bank` | Scrape one source |
| `npm run scrape -- enqueue --all` | Enqueue all BullMQ jobs |
| `npm run scrape -- list` | List registered sources |
| `npm run worker` | Start all queue workers |
| `npm run scheduler` | Start cron scheduler |

## Architecture

```
src/
├── scrapers/          # One file per source (plugin pattern)
├── repositories/      # Prisma data access
├── services/          # Scrape orchestration
├── lib/browser/       # BrowserManager + PagePool
├── queues/            # BullMQ setup
├── workers/           # Category workers
└── scheduler/         # Cron jobs
```

## Adding a Source

1. Create `src/scrapers/<category>/my-source.scraper.ts` extending `BaseScraper`
2. Register it in `src/scrapers/registry.ts`
3. Run `npm run scrape -- scrape my-source`

## Job Deduplication

```typescript
jobHash = sha256(title + company + city)
```

Existing hashes are updated; new hashes are inserted.

## Slug Format

`developpeur-full-stack-casablanca-attijariwafa-bank`

## Deployment

- **Docker Compose** — local Postgres + Redis
- **GitHub Actions** — `.github/workflows/scrape.yml`
- **Linux cron** — `crontab.example`
- **Railway** — `railway.cron.md`

## Environment

See `.env.example` for all configuration options.
