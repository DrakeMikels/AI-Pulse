import { NextResponse } from "next/server"
import { scrapeAndSaveArticles } from "@/lib/scraper"

export async function GET() {
  try {
    console.log("Starting article refresh...")
    const result = await scrapeAndSaveArticles()
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: `Successfully refreshed and saved ${result.count} articles` 
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 500 })
    }
  } catch (error) {
    console.error("Error in refresh API route:", error)
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 })
  }
} 