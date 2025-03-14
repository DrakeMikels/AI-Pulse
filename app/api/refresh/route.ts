import { NextResponse } from "next/server"
import { scrapeAndSaveArticles } from "@/lib/scraper"

export async function GET() {
  console.log("Manual refresh of articles requested")
  
  try {
    const articles = await scrapeAndSaveArticles()
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully refreshed and saved ${articles.length} articles` 
    })
  } catch (error) {
    console.error("Error in refresh API route:", error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    )
  }
} 