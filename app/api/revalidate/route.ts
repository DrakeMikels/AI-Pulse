import { NextRequest, NextResponse } from "next/server";
import { scrapeAndSaveArticles } from "@/lib/scraper";
import { revalidatePath } from "next/cache";

// This route will be called during the build process to pre-populate articles
export async function GET(request: NextRequest) {
  try {
    console.log("Revalidating and refreshing articles...");
    
    // Scrape and save articles
    const result = await scrapeAndSaveArticles();
    
    // Revalidate the homepage and other important paths
    revalidatePath("/");
    revalidatePath("/trending");
    revalidatePath("/api/articles");
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: `Successfully scraped and saved ${result.count} articles`,
        revalidated: true
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error,
        revalidated: false
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Error in revalidate API route:", error);
    return NextResponse.json({ 
      success: false, 
      error: String(error),
      revalidated: false
    }, { status: 500 });
  }
} 