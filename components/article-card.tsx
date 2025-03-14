"use client"

import { useState, useEffect } from "react"
import { Bookmark, ExternalLink, Share2, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { timeAgo, formatDate } from "@/lib/utils"
import type { Article } from "@/types/article"
import { useRouter } from "next/navigation"

interface ArticleCardProps {
  article: Article
}

export function ArticleCard({ article }: ArticleCardProps) {
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isReadingMode, setIsReadingMode] = useState(false)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  // Check if article is bookmarked on component mount
  useEffect(() => {
    const checkBookmarkStatus = async () => {
      try {
        const response = await fetch(`/api/bookmarks/${article.id}`);
        if (response.ok) {
          const data = await response.json();
          setIsBookmarked(data.isBookmarked);
        }
      } catch (error) {
        console.error("Error checking bookmark status:", error);
      }
    };

    checkBookmarkStatus();
  }, [article.id]);

  // Process the article content to remove image tags and URLs
  const processContent = (content: string): string => {
    if (!content) return "";
    
    // First remove any HTML tags completely
    let cleanedContent = content.replace(/<[^>]*>/g, ' ');
    
    // Remove any lines with image URLs or specific patterns
    cleanedContent = cleanedContent
      .split('\n')
      .filter(line => {
        const lowerLine = line.toLowerCase();
        return !(
          lowerLine.includes('src=') || 
          lowerLine.includes('https://storage.googleapis.com/') || 
          lowerLine.includes('uniblog-publish') ||
          lowerLine.match(/^https?:\/\//)
        );
      })
      .join('\n');
    
    // Further clean any remaining HTML entities and trim whitespace
    return cleanedContent
      .replace(/&[a-z0-9]+;/gi, ' ') // Remove HTML entities like &nbsp;
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Get a clean version of the article content for display
  const getCleanSummary = (article: Article): string => {
    if (!article.summary) return "Read the full article for more details.";
    
    // First remove any HTML tags completely
    let cleanSummary = article.summary.replace(/<[^>]*>/g, '');
    
    // If the summary still contains image URLs or specific patterns, return a default message
    if (cleanSummary.includes('src=') || 
        cleanSummary.includes('https://storage.googleapis.com/') ||
        cleanSummary.includes('bsf_rt_marker')) {
      return "Read the full article for more details.";
    }
    
    // Further clean any HTML entities and trim whitespace
    return cleanSummary
      .replace(/&[a-z0-9]+;/gi, ' ') // Remove HTML entities like &nbsp;
      .replace(/\s+/g, ' ')
      .trim();
  };

  const toggleBookmark = async () => {
    try {
      const method = isBookmarked ? "DELETE" : "POST"
      const response = await fetch(`/api/bookmarks/${article.id}`, { method })
      
      if (response.ok) {
        setIsBookmarked(!isBookmarked)
        
        // Force a refresh of the page if we're on the bookmarks page
        if (window.location.pathname.includes('/bookmarks')) {
          router.refresh();
        }
        
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
        text: getCleanSummary(article),
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

  const summarizeArticle = async () => {
    if (aiSummary) {
      // If we already have a summary, just show it
      setIsReadingMode(true)
      return
    }

    setIsSummarizing(true)
    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: article.content,
          title: article.title,
          url: article.url,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to summarize article')
      }

      const data = await response.json()
      setAiSummary(data.summary)
      setIsReadingMode(true)
      
      toast({
        title: "Summary generated",
        description: "AI-powered summary is ready",
        variant: "success",
      })
    } catch (error) {
      console.error("Error summarizing article:", error)
      toast({
        title: "Error",
        description: "Failed to generate summary",
        variant: "destructive",
      })
    } finally {
      setIsSummarizing(false)
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
          <p className="line-clamp-3 text-sm text-muted-foreground">{getCleanSummary(article)}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            {article.topics.map((topic) => (
              <Badge key={topic} variant="outline">
                {topic}
              </Badge>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between p-4 pt-0">
          <div className="flex space-x-1">
            <Button variant="ghost" size="sm" onClick={() => setIsReadingMode(true)}>
              Read More
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={summarizeArticle}
              disabled={isSummarizing}
            >
              {isSummarizing ? "Summarizing..." : "AI Summary"}
            </Button>
          </div>
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
              {aiSummary ? (
                <div className="bg-muted p-4 rounded-lg mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">AI-Generated Summary</h3>
                  </div>
                  <div 
                    className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-primary prose-p:my-2 prose-li:my-0 prose-ul:my-2" 
                    dangerouslySetInnerHTML={{ 
                      __html: aiSummary
                        .replace(/\n/g, '<br>')
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    }} 
                  />
                  <div className="mt-4 text-xs text-muted-foreground flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded-full bg-primary/20"></span>
                    Generated by Claude 3.5 Sonnet
                  </div>
                </div>
              ) : (
                <p className="text-lg font-medium">{getCleanSummary(article)}</p>
              )}
              
              {!aiSummary && (
                <Button 
                  variant="outline" 
                  onClick={summarizeArticle} 
                  disabled={isSummarizing}
                  className="mb-4"
                >
                  {isSummarizing ? "Generating AI Summary..." : "Generate AI Summary"}
                </Button>
              )}

              <div className="prose max-w-none dark:prose-invert">
                {processContent(article.content)
                  .split(/\n+/) // Split by newlines
                  .map((paragraph, index) => {
                    const trimmed = paragraph.trim();
                    if (!trimmed) return null;
                    
                    // Additional check to filter out any remaining URLs or image references
                    if (trimmed.includes('http') || 
                        trimmed.includes('src=') || 
                        trimmed.includes('storage.googleapis.com') ||
                        trimmed.includes('bsf_rt_marker') ||
                        trimmed.match(/^</) ||
                        trimmed.match(/^i>/)) {
                      return null;
                    }
                    
                    return <p key={index}>{trimmed}</p>;
                  })
                  .filter(Boolean) // Remove empty paragraphs
                }
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

