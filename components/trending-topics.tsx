"use client"

import { useEffect, useState } from "react"
import { TrendingUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import type { Topic } from "@/types/topic"

export function TrendingTopics() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTopics() {
      setLoading(true)
      try {
        const response = await fetch("/api/trending")
        const data = await response.json()
        setTopics(data)
      } catch (error) {
        console.error("Error fetching trending topics:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTopics()
  }, [])

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Trending Topics</CardTitle>
        </div>
        <CardDescription>Popular topics in the AI industry right now</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {topics.map((topic) => (
              <div key={topic.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{topic.count}</Badge>
                  <span className="font-medium">{topic.name}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {topic.trend === "up" ? "↑" : "↓"} {topic.percentage}%
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

