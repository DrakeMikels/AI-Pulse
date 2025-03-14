Vercel Deployment Checklist:
1. Environment Variables:
   - ANTHROPIC_API_KEY (already added)
   - REDIS_URL
   - CRON_SECRET (for securing cron endpoints)
2. Cron Jobs:
   - /api/cron/scrape (every 6 hours at minute 0)
   - /api/cron/brave-scrape (every 6 hours at minute 30) - can be disabled
3. Function Execution Limits:
   - API routes set to 60 seconds max duration
4. Regions:
   - Deployed to iad1 (US East)
