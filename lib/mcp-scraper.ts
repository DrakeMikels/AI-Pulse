import { v4 as uuidv4 } from 'uuid';
import { MCPClient, WebSearchResult } from './mcp-client';
import type { Article } from '@/types/article';

// Initialize MCP client
const mcpClient = new MCPClient(process.env.ANTHROPIC_API_KEY || '');

// AI news sources to search for
const AI_NEWS_SOURCES = [
  'Google AI Blog',
  'Anthropic Blog',
  'OpenAI Blog',
  'Hugging Face Blog',
  'AWS Machine Learning Blog',
  'Microsoft AI Blog'
];

/**
 * Fetch articles using MCP web search
 */
export async function fetchArticlesWithMCP(maxArticlesPerSource: number = 3): Promise<Article[]> {
  const articles: Article[] = [];
  
  try {
    // For each source, perform a web search
    for (const source of AI_NEWS_SOURCES) {
      console.log(`Fetching articles from ${source} using MCP...`);
      
      // Search for recent articles from this source
      const searchResults = await mcpClient.webSearch(
        `latest articles from ${source} about artificial intelligence`,
        maxArticlesPerSource
      );
      
      // Process each search result into an article
      for (const result of searchResults) {
        const article = await processSearchResult(result, source);
        if (article) {
          articles.push(article);
        }
      }
    }
    
    console.log(`Total articles fetched with MCP: ${articles.length}`);
    return articles;
  } catch (error) {
    console.error('Error fetching articles with MCP:', error);
    return [];
  }
}

/**
 * Process a search result into an Article object
 */
async function processSearchResult(result: WebSearchResult, sourceName: string): Promise<Article | null> {
  try {
    // Fetch the full content of the article
    const response = await fetch(result.url);
    const html = await response.text();
    
    // Extract main content (this is a simplified approach)
    const content = extractContentFromHtml(html);
    
    // Use MCP to generate a summary
    const summary = await mcpClient.summarizeContent(content);
    
    // Use MCP to extract topics
    const topics = await mcpClient.extractTopics(content, result.title);
    
    // Get current timestamp for createdAt
    const now = new Date().toISOString();
    
    // Create the article object
    return {
      id: uuidv4(),
      title: result.title,
      url: result.url,
      source: sourceName,
      summary: summary || result.snippet,
      content: content,
      imageUrl: extractImageFromHtml(html),
      publishedAt: result.published_date || now,
      createdAt: now,
      topics: topics
    };
  } catch (error) {
    console.error(`Error processing search result for ${result.url}:`, error);
    return null;
  }
}

/**
 * Extract the main content from HTML (simplified)
 */
function extractContentFromHtml(html: string): string {
  // This is a simplified approach - in a real implementation,
  // you would use a library like cheerio to parse the HTML
  
  // Remove script and style tags
  let content = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Extract text from paragraphs
  const paragraphRegex = /<p[^>]*>(.*?)<\/p>/gi;
  const paragraphs: string[] = [];
  let match;
  
  while ((match = paragraphRegex.exec(content)) !== null) {
    // Remove HTML tags from paragraph content
    const text = match[1].replace(/<[^>]*>/g, '');
    if (text.trim()) {
      paragraphs.push(text.trim());
    }
  }
  
  return paragraphs.join('\n\n');
}

/**
 * Extract an image URL from HTML (simplified)
 */
function extractImageFromHtml(html: string): string | null {
  // Look for og:image meta tag
  const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  if (ogImageMatch && ogImageMatch[1]) {
    return ogImageMatch[1];
  }
  
  // Look for the first image in the content
  const imgMatch = html.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/i);
  if (imgMatch && imgMatch[1]) {
    return imgMatch[1];
  }
  
  return null;
} 