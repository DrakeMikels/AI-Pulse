import { NextResponse } from "next/server"
import { scrapeAndSaveArticles } from "@/lib/scraper"

// This endpoint will be called by the Vercel cron job
export async function GET() {
  try {
    // Check for authorization (optional, can be added for security)
    // const authHeader = request.headers.get("authorization");
    // if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    console.log("Starting article scraping...");
    const result = await scrapeAndSaveArticles();
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: `Successfully scraped and saved ${result.count} articles` 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Error in scrape API route:", error);
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 });
  }
}

// Helper function to get headers
function headers() {
  return {
    get: (name: string) => {
      // In a real environment, this would access the actual request headers
      return null
    },
  }
}

