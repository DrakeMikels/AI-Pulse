import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import type { Article } from "@/types/article"
import { bookmarks } from "./bookmarks"

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

export async function GET() {
  return NextResponse.json(Array.from(bookmarks))
} 