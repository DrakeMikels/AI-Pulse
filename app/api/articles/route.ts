import { type NextRequest, NextResponse } from "next/server"
import type { Article } from "@/types/article"
import fs from "fs"
import path from "path"
import { bookmarks } from "../bookmarks/bookmarks"

// Function to get articles from the JSON file
async function getArticles(): Promise<Article[]> {
  try {
    const dataPath = path.join(process.cwd(), "data", "articles.json")

    // Check if the file exists
    if (fs.existsSync(dataPath)) {
      const data = fs.readFileSync(dataPath, "utf8")
      return JSON.parse(data)
    }

    // Return mock data if file doesn't exist
    return mockArticles
  } catch (error) {
    console.error("Error reading articles:", error)
    return mockArticles
  }
}

// Mock data for demonstration (used as fallback)
const mockArticles: Article[] = [
  {
    id: "1",
    title: "OpenAI Releases GPT-4.5 with Enhanced Reasoning Capabilities",
    summary:
      "OpenAI has announced GPT-4.5, featuring significant improvements in reasoning, coding, and multimodal understanding. The new model shows a 30% reduction in hallucinations and better performance on complex tasks.",
    content: "Full article content here...",
    url: "https://openai.com/blog/gpt-4-5",
    imageUrl: "/placeholder.svg?height=200&width=400&text=OpenAI",
    source: "OpenAI",
    topics: ["LLM", "GPT", "Research"],
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    title: "Anthropic Introduces Claude 3.5 Sonnet with Improved Instruction Following",
    summary:
      "Anthropic has released Claude 3.5 Sonnet, a new AI assistant with better instruction following and reduced hallucinations. The model excels at complex reasoning tasks and shows improved performance on benchmarks.",
    content: "Full article content here...",
    url: "https://www.anthropic.com/blog/claude-3-5-sonnet",
    imageUrl: "/placeholder.svg?height=200&width=400&text=Anthropic",
    source: "Anthropic",
    topics: ["LLM", "Claude", "Product"],
    publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: "3",
    title: "DeepMind's AlphaFold 3 Predicts Protein-Drug Interactions with Unprecedented Accuracy",
    summary:
      "DeepMind has unveiled AlphaFold 3, a major advancement in protein structure prediction that can now model protein-drug interactions. This breakthrough could accelerate drug discovery and development processes.",
    content: "Full article content here...",
    url: "https://deepmind.google/blog/alphafold-3",
    imageUrl: "/placeholder.svg?height=200&width=400&text=DeepMind",
    source: "DeepMind",
    topics: ["Research", "Healthcare", "AlphaFold"],
    publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: "4",
    title: "Meta Releases Llama 3.1 as Open Source with 405B Parameters",
    summary:
      "Meta has open-sourced Llama 3.1, their latest large language model with 405 billion parameters. The model demonstrates state-of-the-art performance on various benchmarks while maintaining Meta's commitment to open science.",
    content: "Full article content here...",
    url: "https://ai.meta.com/blog/llama-3-1",
    imageUrl: "/placeholder.svg?height=200&width=400&text=Meta+AI",
    source: "Meta AI",
    topics: ["LLM", "Open Source", "Research"],
    publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: "5",
    title: "Hugging Face Introduces DBRX-2: A New Open Source Mixture-of-Experts Model",
    summary:
      "Hugging Face has released DBRX-2, a new open-source mixture-of-experts model that achieves competitive performance with significantly fewer active parameters during inference, making it more efficient to deploy.",
    content: "Full article content here...",
    url: "https://huggingface.co/blog/dbrx-2",
    imageUrl: "/placeholder.svg?height=200&width=400&text=Hugging+Face",
    source: "Hugging Face",
    topics: ["LLM", "Open Source", "Efficiency"],
    publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: "6",
    title: "Google Introduces Gemini 2.0 with Enhanced Multimodal Capabilities",
    summary:
      "Google has announced Gemini 2.0, featuring significant improvements in multimodal understanding and reasoning. The new model can process and generate content across text, images, audio, and video with greater coherence.",
    content: "Full article content here...",
    url: "https://blog.google/technology/ai/gemini-2-0",
    imageUrl: "/placeholder.svg?height=200&width=400&text=Google+AI",
    source: "Google AI",
    topics: ["Multimodal", "Gemini", "Product"],
    publishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  },
]

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q")
  const source = searchParams.get("source")
  const topic = searchParams.get("topic")
  const timeframe = searchParams.get("timeframe")
  const bookmarked = searchParams.get("bookmarked")

  // Get articles from file or use mock data
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

