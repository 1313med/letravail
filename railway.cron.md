# Railway Cron

Use Railway's cron service or a worker service with a cron trigger:

```bash
# Every 6 hours — enqueue all category jobs
npm run scrape -- enqueue --all

# Or run scheduler in-process
npm run scheduler
```

Set environment variables in Railway:

- `DATABASE_URL`
- `REDIS_URL`
- `MAX_CONCURRENT_SOURCES=5`
- `BROWSER_HEADLESS=true`

Recommended services:

1. **PostgreSQL** — database
2. **Redis** — BullMQ
3. **Worker** — `npm run worker`
4. **Scheduler** — `npm run scheduler` or Railway Cron hitting `npm run scrape -- enqueue --all`
