import { type NextRequest, NextResponse } from "next/server"
import type { Article } from "@/types/article"
import { getArticles } from "@/lib/scraper"
import { bookmarks } from "../bookmarks/bookmarks"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q")
  const source = searchParams.get("source")
  const topic = searchParams.get("topic")
  const timeframe = searchParams.get("timeframe")
  const bookmarked = searchParams.get("bookmarked")

  console.log("API Request params:", { query, source, topic, timeframe, bookmarked });

  // Get articles from storage (now async with Redis)
  const articles = await getArticles()
  let filteredArticles = [...articles]

  // Normalize article dates and fix future dates
  const now = new Date();
  
  filteredArticles = filteredArticles.map(article => {
    // Ensure the article has a valid date
    const publishDate = new Date(article.publishedAt);
    
    // If date is invalid or in the future, set it to now
    if (isNaN(publishDate.getTime()) || publishDate > now) {
      console.log(`Fixing future date for article: ${article.title.substring(0, 30)}...`);
      article.publishedAt = now.toISOString();
    }
    
    return article;
  });
  
  console.log(`Normalized dates for ${articles.length} articles`);

  // Apply search query filter
  if (query) {
    const lowerQuery = query.toLowerCase()
    filteredArticles = filteredArticles.filter(
      (article) =>
        article.title.toLowerCase().includes(lowerQuery) || article.summary.toLowerCase().includes(lowerQuery),
    )
  }

  // Apply source filter
  if (source && source !== "all") {
    filteredArticles = filteredArticles.filter((article) => article.source.toLowerCase() === source.toLowerCase())
  }

  // Apply topic filter
  if (topic && topic !== "all") {
    filteredArticles = filteredArticles.filter((article) =>
      article.topics.some((t) => t.toLowerCase() === topic.toLowerCase()),
    )
  }

  // Apply bookmarks filter
  if (bookmarked === "true") {
    const bookmarkedIds = bookmarks.getAll();
    console.log("Filtering by bookmarks. Bookmarked IDs:", bookmarkedIds);
    filteredArticles = filteredArticles.filter((article) => bookmarkedIds.includes(article.id))
    console.log("After bookmark filtering, articles count:", filteredArticles.length);
  }

  // Apply timeframe filter
  if (timeframe && timeframe !== "all") {
    const now = new Date()
    const cutoffDate = new Date()

    switch (timeframe) {
      case "today":
        cutoffDate.setHours(0, 0, 0, 0)
        break
      case "2days":
        cutoffDate.setDate(now.getDate() - 2)
        break
      case "week":
        cutoffDate.setDate(now.getDate() - 7)
        break
      case "month":
        cutoffDate.setMonth(now.getMonth() - 1)
        break
    }

    console.log(`Using cutoff date for filtering: ${cutoffDate.toISOString()}`);
    const beforeFilter = filteredArticles.length;
    
    filteredArticles = filteredArticles.filter((article) => {
      const articleDate = new Date(article.publishedAt);
      return articleDate >= cutoffDate;
    });
    
    console.log(`Filtered from ${beforeFilter} to ${filteredArticles.length} articles based on timeframe`);
  }

  // Sort by published date (newest first)
  filteredArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

  return NextResponse.json(filteredArticles)
}

