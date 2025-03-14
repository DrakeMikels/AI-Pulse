# MCP Integration for AI Pulse

This document describes the integration of Anthropic's Model Context Protocol (MCP) into the AI Pulse news aggregator.

## Overview

The MCP integration enhances AI Pulse by using Anthropic's Claude to:

1. Search for the latest AI news articles from various sources
2. Generate high-quality summaries of articles
3. Extract relevant topics from article content
4. Process and clean article content for better display

## Setup

### Prerequisites

- An Anthropic API key with access to MCP
- Node.js and npm

### Environment Variables

Add the following to your `.env.local` file:

```
ANTHROPIC_API_KEY=your-anthropic-api-key
```

Also, add this key to your Vercel project settings if deploying there.

## Components

### MCP Client (`lib/mcp-client.ts`)

A TypeScript client for interacting with Anthropic's MCP API. It provides methods for:

- Performing web searches
- Generating article summaries
- Extracting topics from content

### MCP Scraper (`lib/mcp-scraper.ts`)

Uses the MCP client to fetch and process articles from various AI news sources. It:

- Searches for recent articles from specified sources
- Processes search results into Article objects
- Extracts content and images from article pages
- Uses Claude to generate summaries and extract topics

### Enhanced Scraper Integration (`lib/scraper.ts`)

The existing scraper has been enhanced with a new function `scrapeAndSaveArticlesWithMcp()` that:

- Uses the traditional scraping methods
- Supplements with articles from MCP
- Combines results while avoiding duplicates
- Saves the enhanced article collection

### API Endpoints

- `/api/mcp-test`: A test endpoint to verify MCP functionality
- `/api/cron/scrape-mcp`: A cron job endpoint that runs the MCP-enhanced scraping

## Usage

### Testing MCP Integration

Visit `/api/mcp-test` to test the MCP integration. This will return a sample of articles fetched using MCP.

### Scheduled Scraping

The MCP scraping is scheduled to run every 6 hours, 30 minutes after the regular scraping job. This can be configured in `vercel.json`.

## Troubleshooting

### Common Issues

1. **API Key Issues**: Ensure your Anthropic API key is correctly set in environment variables.
2. **Rate Limiting**: MCP has rate limits. If you encounter errors, you may need to reduce the frequency of requests.
3. **Content Extraction**: The content extraction is simplified and may not work perfectly for all websites.

### Logs

Check the application logs for detailed error messages. MCP-related logs are prefixed with "MCP:" for easy identification. 