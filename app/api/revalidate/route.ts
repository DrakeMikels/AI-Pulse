import { NextRequest, NextResponse } from "next/server";
import { scrapeAndSaveArticles, getArticles } from "@/lib/scraper";
import { revalidatePath } from "next/cache";

// Maximum number of retry attempts
const MAX_RETRIES = 3;

// This route will be called during the build process to pre-populate articles
export async function GET(request: NextRequest) {
  try {
    console.log("Revalidating and refreshing articles...");
    
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
    
    // Revalidate the homepage and other important paths
    revalidatePath("/");
    revalidatePath("/trending");
    revalidatePath("/api/articles");
    
    // Check if we have any articles, even if scraping wasn't fully successful
    const currentArticles = getArticles();
    
    if (result?.success) {
      return NextResponse.json({ 
        success: true, 
        message: `Successfully scraped and saved ${result.count} articles`,
        revalidated: true
      });
    } else if (currentArticles && currentArticles.length > 0) {
      // We have some articles, even if scraping wasn't fully successful
      return NextResponse.json({ 
        success: true, 
        message: `Partially successful. Using ${currentArticles.length} available articles.`,
        revalidated: true
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result?.error || "Failed to scrape articles after multiple attempts",
        revalidated: false
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Error in revalidate API route:", error);
    
    // Check if we have any articles despite the error
    const currentArticles = getArticles();
    
    if (currentArticles && currentArticles.length > 0) {
      // We have some articles, even if there was an error
      return NextResponse.json({ 
        success: true, 
        message: `Error occurred but using ${currentArticles.length} available articles.`,
        revalidated: true
      });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: String(error),
      revalidated: false
    }, { status: 500 });
  }
} 