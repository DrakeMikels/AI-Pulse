"use client"

import { useState } from "react"
import { Bookmark, ExternalLink, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { timeAgo, formatDate } from "@/lib/utils"
import type { Article } from "@/types/article"

interface ArticleCardProps {
  article: Article
}

export function ArticleCard({ article }: ArticleCardProps) {
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isReadingMode, setIsReadingMode] = useState(false)
  const { toast } = useToast()

  const toggleBookmark = async () => {
    try {
      const method = isBookmarked ? "DELETE" : "POST"
      const response = await fetch(`/api/bookmarks/${article.id}`, { method })
      
      if (response.ok) {
        setIsBookmarked(!isBookmarked)
        toast({
          title: isBookmarked ? "Removed from bookmarks" : "Added to bookmarks",
          description: article.title,
          variant: isBookmarked ? "default" : "success",
        })
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error)
      toast({
        title: "Error",
        description: "Failed to update bookmark status",
        variant: "destructive",
      })
    }
  }

  const shareArticle = () => {
    if (navigator.share) {
      navigator.share({
        title: article.title,
        text: article.summary,
        url: article.url,
      }).catch((error) => console.error("Error sharing:", error))
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(article.url)
        .then(() => {
          toast({
            title: "Link copied",
            description: "Article link copied to clipboard",
          })
        })
        .catch((error) => console.error("Error copying to clipboard:", error))
    }
  }

  return (
    <>
      <Card className="h-full flex flex-col overflow-hidden transition-all hover:shadow-md">
        <CardHeader className="p-0">
          <div className="relative h-48 w-full overflow-hidden bg-muted">
            {article.imageUrl ? (
              <img
                src={article.imageUrl}
                alt={article.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted">
                <span className="text-muted-foreground">{article.source}</span>
              </div>
            )}
            <div className="absolute bottom-2 left-2">
              <Badge variant="secondary" className="bg-primary text-primary-foreground">
                {article.source}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 space-y-2 p-4">
          <div className="flex justify-between items-center">
            <h3 className="line-clamp-2 text-xl font-bold">{article.title}</h3>
            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
              {timeAgo(article.publishedAt)}
            </span>
          </div>
          <p className="line-clamp-3 text-sm text-muted-foreground">{article.summary}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            {article.topics.map((topic) => (
              <Badge key={topic} variant="outline">
                {topic}
              </Badge>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between p-4 pt-0">
          <Button variant="ghost" size="sm" onClick={() => setIsReadingMode(true)}>
            Read More
          </Button>
          <div className="flex space-x-1">
            <Button variant="ghost" size="icon" onClick={toggleBookmark}>
              <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-primary" : ""}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={shareArticle}>
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <a href={article.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </CardFooter>
      </Card>

      <Dialog open={isReadingMode} onOpenChange={setIsReadingMode}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">{article.title}</DialogTitle>
            <DialogDescription className="flex items-center justify-between">
              <span>Source: {article.source}</span>
              <span>Published: {formatDate(article.publishedAt)}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
            {article.imageUrl && (
              <div className="mb-6 overflow-hidden rounded-lg">
                <img
                  src={article.imageUrl}
                  alt={article.title}
                  className="h-auto w-full object-cover"
                />
              </div>
            )}
            <div className="space-y-4">
              <p className="text-lg font-medium">{article.summary}</p>
              <div className="prose max-w-none dark:prose-invert">
                <div dangerouslySetInnerHTML={{ __html: article.content }} />
              </div>
              <div className="flex flex-wrap gap-2 pt-4">
                {article.topics.map((topic) => (
                  <Badge key={topic} variant="outline">
                    {topic}
                  </Badge>
                ))}
              </div>
              <div className="pt-4">
                <Button asChild>
                  <a href={article.url} target="_blank" rel="noopener noreferrer">
                    Read Original Article
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

