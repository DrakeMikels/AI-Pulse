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
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // Load articles from localStorage on initial render
  useEffect(() => {
    try {
      const cachedArticles = localStorage.getItem('cachedArticles')
      if (cachedArticles) {
        const parsedArticles = JSON.parse(cachedArticles)
        if (parsedArticles && Array.isArray(parsedArticles) && parsedArticles.length > 0) {
          console.log(`Loaded ${parsedArticles.length} articles from localStorage`)
          setArticles(parsedArticles)
          // Still fetch fresh articles, but we have something to show immediately
        }
      }
    } catch (e) {
      console.error('Error loading cached articles from localStorage:', e)
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    let retryTimeout: NodeJS.Timeout

    async function fetchArticles() {
      if (!isMounted) return
      
      setLoading(true)
      setError(null)
      
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

        console.log(`Fetching articles with params: ${params.toString()}`)
        const response = await fetch(`/api/articles?${params.toString()}`)
        
        if (!response.ok) {
          throw new Error(`API returned ${response.status}: ${response.statusText}`)
        }
        
        const data = await response.json()
        
        if (!isMounted) return
        
        if (data && Array.isArray(data)) {
          console.log(`Fetched ${data.length} articles successfully`)
          setArticles(data)
          setRetryCount(0) // Reset retry count on success
          
          // Cache in localStorage for future visits
          try {
            localStorage.setItem('cachedArticles', JSON.stringify(data))
            console.log('Cached articles in localStorage')
          } catch (e) {
            console.error('Error caching articles in localStorage:', e)
          }
        } else {
          console.error('Invalid data format received:', data)
          setError('Received invalid data format from server')
          
          // If we have no articles, retry
          if (articles.length === 0 && retryCount < 3) {
            handleRetry()
          }
        }
      } catch (error) {
        if (!isMounted) return
        
        console.error("Error fetching articles:", error)
        setError(`Failed to load articles: ${error instanceof Error ? error.message : 'Unknown error'}`)
        
        // If we have no articles, retry
        if (articles.length === 0 && retryCount < 3) {
          handleRetry()
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    
    function handleRetry() {
      setRetryCount(prev => prev + 1)
      console.log(`Retrying fetch (attempt ${retryCount + 1}/3) in 2 seconds...`)
      retryTimeout = setTimeout(fetchArticles, 2000)
    }

    fetchArticles()
    
    return () => {
      isMounted = false
      if (retryTimeout) clearTimeout(retryTimeout)
    }
  }, [searchQuery, source, topic, timeframe, bookmarksOnly, filters, retryCount])

  // Show loading state only on initial load, not during refetches if we already have articles
  if (loading && articles.length === 0) {
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

  // Show error with retry button
  if (error && articles.length === 0) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-6">
        <p className="mb-4 text-center text-muted-foreground">{error}</p>
        <button 
          onClick={() => setRetryCount(prev => prev + 1)} 
          className="rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          Retry
        </button>
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

