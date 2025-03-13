import { NextResponse } from "next/server"
import type { Topic } from "@/types/topic"
import fs from "fs"
import path from "path"
import type { Article } from "@/types/article"

// Function to get articles from the JSON file
async function getArticles(): Promise<Article[]> {
  try {
    const dataPath = path.join(process.cwd(), "data", "articles.json")

    // Check if the file exists
    if (fs.existsSync(dataPath)) {
      const data = fs.readFileSync(dataPath, "utf8")
      return JSON.parse(data)
    }

    return []
  } catch (error) {
    console.error("Error reading articles:", error)
    return []
  }
}

// Mock data as fallback
const mockTopics: Topic[] = [
  {
    id: "1",
    name: "GPT-4.5",
    count: 42,
    trend: "up",
    percentage: 15,
  },
  {
    id: "2",
    name: "Multimodal AI",
    count: 38,
    trend: "up",
    percentage: 12,
  },
  {
    id: "3",
    name: "Open Source LLMs",
    count: 35,
    trend: "up",
    percentage: 8,
  },
  {
    id: "4",
    name: "AI Regulation",
    count: 29,
    trend: "down",
    percentage: 3,
  },
  {
    id: "5",
    name: "AI Safety",
    count: 24,
    trend: "up",
    percentage: 5,
  },
]

export async function GET() {
  try {
    const articles = await getArticles()
    
    if (articles.length === 0) {
      return NextResponse.json(mockTopics)
    }
    
    // Count topics
    const topicCounts: Record<string, number> = {}
    
    articles.forEach(article => {
      article.topics.forEach(topic => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1
      })
    })
    
    // Convert to array and sort by count
    const sortedTopics = Object.entries(topicCounts)
      .map(([name, count]) => ({
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        count,
        trend: "up", // Default trend
        percentage: Math.floor(Math.random() * 20) + 1, // Random percentage for now
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5) // Get top 5
    
    return NextResponse.json(sortedTopics)
  } catch (error) {
    console.error("Error getting trending topics:", error)
    return NextResponse.json(mockTopics)
  }
}

