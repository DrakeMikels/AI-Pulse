import { NextResponse } from "next/server";
import { scrapeAndSaveArticlesWithMcp } from "@/lib/scraper";

export async function GET() {
  try {
    // Check if this is a cron job request
    const authHeader = headers().get("Authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    console.log("Starting scheduled MCP article scraping...");
    const result = await scrapeAndSaveArticlesWithMcp();
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in cron job:", error);
    return NextResponse.json(
      { error: "Failed to scrape articles" },
      { status: 500 }
    );
  }
}

// Helper function to get headers
function headers() {
  return {
    get: (name: string) => {
      if (typeof window === "undefined") {
        // Server-side
        const { headers } = require("next/headers");
        return headers().get(name);
      }
      return null; // Client-side (should never happen for API routes)
    }
  };
} 