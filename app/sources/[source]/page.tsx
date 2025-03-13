import { Dashboard } from "@/components/dashboard"
import { ArticleGrid } from "@/components/article-grid"

export default async function SourcePage({ params }: { params: { source: string } }) {
  const sourceNames: Record<string, string> = {
    openai: "OpenAI",
    anthropic: "Anthropic",
    deepmind: "DeepMind",
    meta: "Meta AI",
    huggingface: "Hugging Face",
    aiblog: "AI Blog"
  }

  const sourceName = sourceNames[params.source] || params.source

  return (
    <Dashboard>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">{sourceName} Articles</h1>
        <ArticleGrid source={params.source} topic="all" timeframe="all" />
      </div>
    </Dashboard>
  )
} 