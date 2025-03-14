import { NextResponse } from "next/server"
import type { Article } from "@/types/article"
import { bookmarks } from "./bookmarks"
import { getArticles } from "@/lib/scraper"

export async function GET() {
  try {
    // Get all articles
    const allArticles = await getArticles();
    
    // Get bookmarked article IDs
    const bookmarkedIds = bookmarks.getAll();
    
    // Filter articles to only include bookmarked ones
    const bookmarkedArticles = allArticles.filter(article => 
      bookmarkedIds.includes(article.id)
    );
    
    return NextResponse.json(bookmarkedArticles);
  } catch (error) {
    console.error("Error getting bookmarked articles:", error);
    return NextResponse.json([], { status: 500 });
  }
} 