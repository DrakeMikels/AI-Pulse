import { NextResponse } from "next/server"
import type { Article } from "@/types/article"
import { bookmarks } from "./bookmarks"
import { getArticles } from "@/lib/scraper"

export async function GET() {
  try {
    // Initialize bookmarks from localStorage if needed
    // Get all articles
    const allArticles = await getArticles();
    
    // Get bookmarked article IDs
    const bookmarkedIds = bookmarks.getAll();
    
    console.log("Bookmarked IDs:", bookmarkedIds); // Debug log
    
    // Filter articles to only include bookmarked ones
    const bookmarkedArticles = allArticles.filter(article => 
      bookmarkedIds.includes(article.id)
    );
    
    console.log("Found bookmarked articles:", bookmarkedArticles.length); // Debug log
    
    return NextResponse.json(bookmarkedArticles);
  } catch (error) {
    console.error("Error getting bookmarked articles:", error);
    return NextResponse.json({ error: "Failed to get bookmarked articles" }, { status: 500 });
  }
} 