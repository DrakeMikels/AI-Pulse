import { Dashboard } from "@/components/dashboard"
import { ArticleGrid } from "@/components/article-grid"

export default function BookmarksPage() {
  return (
    <Dashboard>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Bookmarked Articles</h1>
        <ArticleGrid source="all" topic="all" timeframe="all" bookmarksOnly={true} />
      </div>
    </Dashboard>
  )
} 