Vercel Deployment Checklist:
1. Environment Variables:
   - ANTHROPIC_API_KEY (already added)
     - Note: Now using direct Anthropic SDK
     - Important: Ensure the API key is in the correct format (should start with 'sk-ant-')
     - Check the API key format using the /api/check-api-key endpoint
   - REDIS_URL
   - CRON_SECRET (for securing cron endpoints)
2. Cron Jobs:
   - /api/cron/scrape (every 6 hours at minute 0)
   - /api/cron/brave-scrape (every 6 hours at minute 30) - can be disabled
3. Function Execution Limits:
   - API routes set to 60 seconds max duration
4. Regions:
   - Deployed to iad1 (US East)
5. Dependencies:
   - Added ai and @ai-sdk/anthropic packages for article summarization
   - Using @anthropic-ai/sdk for direct API access
