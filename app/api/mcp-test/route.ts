import { NextResponse } from "next/server";
import { fetchArticlesWithMCP } from "@/lib/mcp-scraper";

export async function GET() {
  try {
    // Check if the ANTHROPIC_API_KEY is set
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not set in environment variables" },
        { status: 500 }
      );
    }
    
    // Fetch articles using MCP (limit to 1 per source for testing)
    const articles = await fetchArticlesWithMCP(1);
    
    return NextResponse.json({
      success: true,
      count: articles.length,
      articles
    });
  } catch (error) {
    console.error("Error in MCP test endpoint:", error);
    return NextResponse.json(
      { error: "Failed to fetch articles using MCP" },
      { status: 500 }
    );
  }
} 