# AI Pulse

AI Pulse is a web-based dashboard for scraping and summarizing AI news from various sources.

## Features

- Aggregates AI news from multiple sources (OpenAI, Anthropic, Google AI, etc.)
- Uses Brave Search API to find the latest AI articles
- Summarizes articles using OpenAI's API
- Provides a clean, modern UI for browsing articles
- Allows bookmarking favorite articles
- Supports filtering by source, timeframe, and search terms
- Dark mode support
- Responsive design for mobile and desktop

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS, Shadcn/UI
- **Backend**: Node.js with Express.js, Python for scraping
- **APIs**: OpenAI API for article summarization, Brave Search API for content discovery
- **Deployment**: Vercel

## Local Development

### Prerequisites

- Node.js (v18 or later)
- Python (v3.8 or later)
- OpenAI API key
- Brave Search API key

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
   OPENAI_API_KEY=your_openai_api_key_here
   BRAVE_API_KEY=your_brave_api_key_here
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
   - OPENAI_API_KEY: Your OpenAI API key
   - BRAVE_API_KEY: Your Brave Search API key

4. Deploy the project.

5. Set up the cron job for automatic scraping:
   - Vercel will use the configuration in `vercel.json` to run the scraper every 6 hours

## Brave Search API

This project uses the Brave Search API to discover the latest AI news articles. The free tier of the Brave Search API allows:
- 1 request per second
- 2,000 requests per month
- Web search capability

To get your own Brave Search API key:
1. Sign up at [https://brave.com/search/api/](https://brave.com/search/api/)
2. Create a new API key
3. Add the key to your environment variables as `BRAVE_API_KEY`

## Deployment Notes

This project is configured for deployment on Vercel. The application uses client-side URL handling to avoid issues with `useSearchParams()` in server components.

## License

MIT

