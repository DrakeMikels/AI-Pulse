import { NextResponse } from "next/server"
import { scrapeAndSaveArticlesWithBrave } from "@/lib/scraper"

// This endpoint will be called by the Vercel cron job
export async function GET() {
  try {
    // Check for authorization (optional, can be added for security)
    // const authHeader = request.headers.get("authorization");
    // if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    console.log("Starting article scraping with Brave Search...");
    const result = await scrapeAndSaveArticlesWithBrave();
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: `Successfully scraped and saved ${result.count} articles using Brave Search` 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Error in Brave scrape API route:", error);
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 });
  }
} 