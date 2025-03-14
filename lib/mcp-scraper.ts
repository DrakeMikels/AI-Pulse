import { BraveSearchClient } from './brave-mcp-client';
import type { Article } from '@/types/article';
import { v4 as uuidv4 } from 'uuid';

/**
 * Fetch articles using the Brave Search client
 * @param maxArticlesPerSource Maximum number of articles to fetch per source
 * @returns Array of articles
 */
export async function fetchArticlesWithMCP(maxArticlesPerSource: number = 5): Promise<Article[]> {
  console.log(`Fetching articles with Brave Search, max ${maxArticlesPerSource} per source`);
  
  // Set Brave API key from environment variable
  const braveApiKey = process.env.BRAVE_API_KEY;
  
  if (!braveApiKey) {
    console.error('BRAVE_API_KEY not set in environment variables');
    return [];
  }
  
  // Initialize the Brave client
  const braveClient = new BraveSearchClient(braveApiKey);
  
  // Connect to the API first
  await braveClient.connect();
  
  // Define sources to fetch articles from
  const sources = [
    'Google AI Blog',
    'Anthropic Blog',
    'OpenAI Blog',
    'Hugging Face Blog',
    'AWS Machine Learning Blog',
    'Microsoft AI Blog'
  ];
  
  const allArticles: Article[] = [];
  
  // Fetch articles from each source
  for (const source of sources) {
    try {
      console.log(`Fetching articles from ${source} using Brave Search...`);
      
      // Perform web search to find articles
      const searchResults = await braveClient.webSearch(`latest articles from ${source} about artificial intelligence research`, maxArticlesPerSource);
      
      // Process each search result
      for (const result of searchResults.slice(0, maxArticlesPerSource)) {
        try {
          // Fetch and process the article
          const article = await braveClient.fetchArticle(result.url);
          
          if (article) {
            allArticles.push(article);
          }
        } catch (error) {
          console.error(`Error processing search result: ${error}`);
        }
      }
    } catch (error) {
      console.error(`Error fetching articles from ${source}: ${error}`);
    }
  }
  
  console.log(`Successfully fetched ${allArticles.length} articles with Brave Search`);
  return allArticles;
}

/**
 * Process a search result into an Article object
 */
async function processSearchResult(result: any, sourceName: string): Promise<Article | null> {
  try {
    // Fetch the full content of the article
    const response = await fetch(result.url);
    const html = await response.text();
    
    // Extract main content (this is a simplified approach)
    const content = extractContentFromHtml(html);
    
    // Extract topics from content
    const topics = extractTopicsFromContent(content, result.title);
    
    // Get current timestamp for createdAt
    const now = new Date().toISOString();
    
    // Create the article object
    return {
      id: uuidv4(),
      title: result.title,
      url: result.url,
      source: sourceName,
      summary: result.snippet || content.substring(0, 200) + '...',
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
 * Extract topics from content
 */
function extractTopicsFromContent(content: string, title: string): string[] {
  const topics = new Set<string>();
  
  // Common AI-related topics
  const aiTopics = [
    'AI', 'Artificial Intelligence', 'Machine Learning', 'ML', 'Deep Learning',
    'Neural Networks', 'NLP', 'Natural Language Processing', 'Computer Vision',
    'Generative AI', 'LLM', 'Large Language Model', 'Transformer', 'GPT',
    'Claude', 'Gemini', 'Llama', 'Mistral', 'AI Ethics', 'AI Safety'
  ];
  
  // Check content and title for topics
  for (const topic of aiTopics) {
    if (content.includes(topic) || title.includes(topic)) {
      topics.add(topic);
    }
  }
  
  return Array.from(topics);
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