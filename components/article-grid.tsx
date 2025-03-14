"use client"

import { useEffect, useState } from "react"
import { ArticleCard } from "@/components/article-card"
import { Skeleton } from "@/components/ui/skeleton"
import type { Article } from "@/types/article"

interface ArticleGridProps {
  searchQuery?: string
  source?: string
  topic?: string
  timeframe?: string
  bookmarksOnly?: boolean
  filters?: {
    source: string
    topic: string
    timeframe: string
  }
}

export function ArticleGrid({ 
  searchQuery = "", 
  source = "all", 
  topic = "all", 
  timeframe = "2days", 
  bookmarksOnly = false,
  filters 
}: ArticleGridProps) {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchArticles() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (searchQuery) params.append("q", searchQuery)
        
        // Use either direct props or filters object
        const sourceValue = filters?.source || source
        const topicValue = filters?.topic || topic
        const timeframeValue = filters?.timeframe || timeframe
        
        if (sourceValue !== "all") params.append("source", sourceValue)
        if (topicValue !== "all") params.append("topic", topicValue)
        if (timeframeValue !== "all") params.append("timeframe", timeframeValue)
        if (bookmarksOnly) params.append("bookmarked", "true")

        const response = await fetch(`/api/articles?${params.toString()}`)
        const data = await response.json()
        setArticles(data)
      } catch (error) {
        console.error("Error fetching articles:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchArticles()
  }, [searchQuery, source, topic, timeframe, bookmarksOnly, filters])

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col space-y-3">
            <Skeleton className="h-[200px] w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (articles.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed">
        <p className="text-center text-muted-foreground">No articles found. Try adjusting your filters.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  )
}

