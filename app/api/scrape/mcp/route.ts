import { NextResponse } from 'next/server';
import { fetchArticlesWithMCP } from '@/lib/mcp-scraper';

export async function GET() {
  try {
    // Check if the ANTHROPIC_API_KEY is set
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { 
          error: "ANTHROPIC_API_KEY is not set in environment variables",
          help: "Please add your Anthropic API key to .env.local or Vercel environment variables"
        },
        { status: 500 }
      );
    }
    
    console.log("Starting MCP scraper with API key:", process.env.ANTHROPIC_API_KEY.substring(0, 5) + "...");
    
    // Fetch articles using MCP (limit to 2 per source for faster response)
    const startTime = Date.now();
    const articles = await fetchArticlesWithMCP(2);
    const duration = Date.now() - startTime;
    
    // Extract basic info for the response
    const articleSummaries = articles.map(article => ({
      id: article.id,
      title: article.title,
      source: article.source,
      topics: article.topics,
      url: article.url,
      summaryLength: article.summary.length,
      contentLength: article.content.length,
      hasImage: !!article.imageUrl
    }));
    
    return NextResponse.json({
      success: true,
      count: articles.length,
      duration: `${(duration / 1000).toFixed(2)} seconds`,
      sources: [...new Set(articles.map(a => a.source))],
      articleSummaries,
      // Include one full article as an example
      sampleArticle: articles.length > 0 ? articles[0] : null
    });
  } catch (error) {
    console.error("Error in MCP scraper endpoint:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch articles using MCP",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 