import { Dashboard } from "@/components/dashboard"
import { ArticleGrid } from "@/components/article-grid"

export default async function SourcePage({ params }: { params: { source: string } }) {
  // Make sure params is properly awaited
  const source = await Promise.resolve(params.source)
  
  const sourceNames: Record<string, string> = {
    awsml: "AWS ML",
    deepmind: "DeepMind",
    openai: "OpenAI",
    metaresearch: "Meta Research",
    googleresearch: "Google Research"
  }

  const sourceName = sourceNames[source] || source

  return (
    <Dashboard>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">{sourceName} Articles</h1>
        <ArticleGrid source={source} topic="all" timeframe="all" />
      </div>
    </Dashboard>
  )
} 