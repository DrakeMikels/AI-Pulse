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

  // Get articles from storage (now async with Redis)
  const articles = await getArticles()
  let filteredArticles = [...articles]

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
    filteredArticles = filteredArticles.filter((article) => bookmarks.has(article.id))
  }

  // Apply timeframe filter
  if (timeframe && timeframe !== "all") {
    const now = new Date()
    const cutoffDate = new Date()

    switch (timeframe) {
      case "today":
        cutoffDate.setHours(0, 0, 0, 0)
        break
      case "week":
        cutoffDate.setDate(now.getDate() - 7)
        break
      case "month":
        cutoffDate.setMonth(now.getMonth() - 1)
        break
    }

    filteredArticles = filteredArticles.filter((article) => new Date(article.publishedAt) >= cutoffDate)
  }

  // Sort by published date (newest first)
  filteredArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

  return NextResponse.json(filteredArticles)
}

