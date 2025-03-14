import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"
import path from "path"
import fs from "fs"
import { scrapeAndSaveArticles } from "@/lib/scraper"

const execPromise = promisify(exec)

// Fallback function to simulate scraping when Python is not available
async function fallbackScraping() {
  console.log("Using fallback scraping mechanism for cron job")
  
  // Path to the sample data file
  const dataPath = path.join(process.cwd(), "data", "articles.json")
  
  try {
    // Check if the data directory exists, if not create it
    const dataDir = path.join(process.cwd(), "data")
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    
    // Generate some sample articles if the file doesn't exist
    if (!fs.existsSync(dataPath)) {
      const sampleArticles = generateSampleArticles()
      fs.writeFileSync(dataPath, JSON.stringify(sampleArticles, null, 2))
      return "Generated sample articles"
    } else {
      // Update timestamps on existing articles to make them appear fresh
      const articles = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
      const updatedArticles = articles.map(article => ({
        ...article,
        publishedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }))
      fs.writeFileSync(dataPath, JSON.stringify(updatedArticles, null, 2))
      return "Updated existing articles"
    }
  } catch (error) {
    console.error("Error in fallback scraping:", error)
    throw error
  }
}

// Generate sample articles for the fallback mechanism
function generateSampleArticles() {
  const sources = ["Anthropic", "OpenAI", "Google AI", "DeepMind", "Meta AI"]
  const topics = ["LLM", "Computer Vision", "AI Safety", "Multimodal AI", "Research"]
  
  return Array.from({ length: 10 }, (_, i) => ({
    id: `sample-${i}-${Date.now()}`,
    title: `Sample Article ${i + 1}`,
    summary: `This is a sample article summary for article ${i + 1}.`,
    content: `This is the content of sample article ${i + 1}. It contains information about AI advancements.`,
    url: `https://example.com/article-${i + 1}`,
    imageUrl: `https://placehold.co/600x400?text=AI+Article+${i + 1}`,
    source: sources[i % sources.length],
    topics: [topics[i % topics.length], topics[(i + 1) % topics.length]],
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  }))
}

// This endpoint will be called by the Vercel cron job
export async function GET() {
  console.log('Starting scraper cron job...');
  
  try {
    const articles = await scrapeAndSaveArticles();
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully refreshed and saved ${articles.length} articles` 
    });
  } catch (error) {
    console.error('Error in scraper cron job:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

// Helper function to get headers
function headers() {
  return {
    get: (name: string) => {
      // In a real environment, this would access the actual request headers
      return null
    },
  }
}

