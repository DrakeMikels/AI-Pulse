# AI Pulse

AI Pulse is a web-based dashboard for scraping and summarizing AI news from various sources.

## Features

- Aggregates AI news from multiple sources (OpenAI, Anthropic, Google AI, etc.)
- Uses traditional web scraping to find the latest AI articles
- Summarizes articles using Anthropic's Claude API via Vercel AI SDK
- Provides a clean, modern UI for browsing articles
- Allows bookmarking favorite articles
- Supports filtering by source, timeframe, and search terms
- Dark mode support
- Responsive design for mobile and desktop

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS, Shadcn/UI
- **Backend**: Node.js with Express.js, Python for scraping
- **APIs**: Anthropic Claude API for article summarization via Vercel AI SDK
- **Deployment**: Vercel

## Local Development

### Prerequisites

- Node.js (v18 or later)
- Python (v3.8 or later)
- Anthropic API key

### Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd ai-pulse
   ```

2. Install dependencies:
   ```bash
   npm install
   pip install -r requirements.txt
   ```

3. Create a `.env` file in the root directory with your API keys:
   ```
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Scraping Articles

To manually scrape articles:

```bash
python scripts/scraper.py
```

Or use the UI's "Refresh Articles" button in the Settings page.

## Deployment to Vercel

1. Push your code to GitHub.

2. Connect your GitHub repository to Vercel:
   - Sign up or log in to [Vercel](https://vercel.com)
   - Click "New Project" and import your GitHub repository
   - Configure the project:
     - Framework Preset: Next.js
     - Root Directory: ./
     - Build Command: npm run build
     - Output Directory: .next

3. Add environment variables:
   - ANTHROPIC_API_KEY: Your Anthropic API key
   - REDIS_URL: Your Redis database URL
   - CRON_SECRET: A secret key for securing cron endpoints

4. Deploy the project.

5. Set up the cron job for automatic scraping:
   - Vercel will use the configuration in `vercel.json` to run the scraper every 6 hours

## Vercel AI SDK

This project uses the Vercel AI SDK with Anthropic's Claude model to summarize articles. The Vercel AI SDK provides a unified interface for working with various AI models.

To learn more about the Vercel AI SDK:
1. Visit [https://sdk.vercel.ai/docs](https://sdk.vercel.ai/docs)
2. Check out the Anthropic provider documentation at [https://sdk.vercel.ai/providers/ai-sdk-providers/anthropic](https://sdk.vercel.ai/providers/ai-sdk-providers/anthropic)

## Deployment Notes

This project is configured for deployment on Vercel. The application uses client-side URL handling to avoid issues with `useSearchParams()` in server components.

## License

MIT

