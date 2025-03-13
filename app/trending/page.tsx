import { Dashboard } from "@/components/dashboard"
import { ArticleGrid } from "@/components/article-grid"

export default function TrendingPage() {
  return (
    <Dashboard>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Trending Articles</h1>
        <ArticleGrid source="all" topic="all" timeframe="week" />
      </div>
    </Dashboard>
  )
} 