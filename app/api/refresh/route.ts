import { NextResponse } from "next/server"
import { scrapeAndSaveArticles, getArticles } from "@/lib/scraper"

// Maximum number of retry attempts
const MAX_RETRIES = 3;

export async function GET() {
  try {
    console.log("Starting article refresh...")
    
    let result;
    let retryCount = 0;
    
    // Implement retry logic
    while (retryCount < MAX_RETRIES) {
      // Scrape and save articles
      result = await scrapeAndSaveArticles();
      
      // If successful or we have at least some articles, break the retry loop
      if (result.success || (result.count && result.count > 0)) {
        break;
      }
      
      // If not successful, wait and retry
      console.log(`Scraping attempt ${retryCount + 1} failed. Retrying in 3 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      retryCount++;
    }
    
    // Check if we have any articles, even if scraping wasn't fully successful
    const currentArticles = getArticles();
    
    if (result?.success) {
      return NextResponse.json({ 
        success: true, 
        message: `Successfully refreshed and saved ${result.count} articles` 
      })
    } else if (currentArticles && currentArticles.length > 0) {
      // We have some articles, even if scraping wasn't fully successful
      return NextResponse.json({ 
        success: true, 
        message: `Partially successful. Using ${currentArticles.length} available articles.`
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result?.error || "Failed to scrape articles after multiple attempts"
      }, { status: 500 })
    }
  } catch (error) {
    console.error("Error in refresh API route:", error)
    
    // Check if we have any articles despite the error
    const currentArticles = getArticles();
    
    if (currentArticles && currentArticles.length > 0) {
      // We have some articles, even if there was an error
      return NextResponse.json({ 
        success: true, 
        message: `Error occurred but using ${currentArticles.length} available articles.`
      })
    }
    
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 })
  }
} 