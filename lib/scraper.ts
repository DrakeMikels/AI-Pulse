import axios from 'axios';
import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';
import { parseStringPromise } from 'xml2js';
import type { Article } from '@/types/article';
import Redis from 'ioredis';
import { fetchArticlesWithMCP } from './mcp-scraper';
import { fetchArticlesWithBrave } from './brave-scraper';

// Redis client initialization
let redisClient: Redis | null = null;

// Redis key for storing articles with timestamp to force refresh
const ARTICLES_REDIS_KEY = `articles_${new Date().toISOString().split('T')[0]}`;

// Initialize Redis client
function getRedisClient() {
  if (redisClient) return redisClient;
  
  // Check if we have a Redis URL from Vercel
  const redisUrl = process.env.REDIS_URL || "redis://default:7SXHj1HFOhuJz85v1xMTsdds0XpeIvKM@redis-15843.c90.us-east-1-3.ec2.redns.redis-cloud.com:15843";
  
  if (!redisUrl) {
    console.warn('Redis URL not found in environment variables');
    return null;
  }
  
  try {
    redisClient = new Redis(redisUrl);
    console.log('Redis client initialized with URL:', redisUrl);
    return redisClient;
  } catch (error) {
    console.error('Failed to initialize Redis client:', error);
    return null;
  }
}

// In-memory cache for articles (will be reset on server restart)
let cachedArticles: Article[] = [];

// User agent rotation to avoid being blocked
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36'
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Define source types
interface BaseSource {
  url: string;
  type: string;
  base_url: string;
}

interface HtmlSource extends BaseSource {
  type: "html";
  selector: string;
  title_selector: string;
  link_selector: string;
}

interface RssSource extends BaseSource {
  type: "rss";
}

type Source = HtmlSource | RssSource;

// Sources to scrape
const SOURCES: Record<string, Source> = {
  "AWS ML": {
    "url": "https://aws.amazon.com/blogs/machine-learning/",
    "type": "html",
    "selector": "article, .blog-post",
    "title_selector": "h2, .blog-post-title",
    "link_selector": "a",
    "base_url": "https://aws.amazon.com"
  },
  "Wired AI": {
    "url": "https://www.wired.com/feed/tag/ai/latest/rss",
    "type": "rss",
    "base_url": "https://www.wired.com"
  },
  "AI Blog": {
    "url": "https://www.artificial-intelligence.blog/ai-news?format=rss",
    "type": "rss",
    "base_url": "https://www.artificial-intelligence.blog"
  },
  "Google AI": {
    "url": "https://blog.google/technology/ai/rss/",
    "type": "rss",
    "base_url": "https://blog.google"
  },
  "Anthropic": {
    "url": "https://www.anthropic.com/news",
    "type": "html",
    "selector": "li.group, article",
    "title_selector": "h3, h2",
    "link_selector": "a",
    "base_url": "https://www.anthropic.com"
  },
  "Hugging Face": {
    "url": "https://huggingface.co/blog/feed.xml",
    "type": "rss",
    "base_url": "https://huggingface.co"
  },
  "MIT Technology Review": {
    "url": "https://www.technologyreview.com/topic/artificial-intelligence/feed",
    "type": "rss",
    "base_url": "https://www.technologyreview.com"
  },
  "VentureBeat AI": {
    "url": "https://venturebeat.com/category/ai/feed/",
    "type": "rss",
    "base_url": "https://venturebeat.com"
  },
  "TechCrunch AI": {
    "url": "https://techcrunch.com/category/artificial-intelligence/feed/",
    "type": "rss",
    "base_url": "https://techcrunch.com"
  },
  "NVIDIA Blog": {
    "url": "https://blogs.nvidia.com/blog/category/deep-learning/feed/",
    "type": "rss",
    "base_url": "https://blogs.nvidia.com"
  }
};

/**
 * Scrape articles from an RSS feed
 */
async function scrapeRss(url: string, sourceName: string) {
  try {
    const headers = {
      'User-Agent': getRandomUserAgent(),
      'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5'
    };
    
    const response = await axios.get(url, { 
      headers,
      timeout: 10000, // 10 second timeout
      maxRedirects: 5
    });
    console.log(`RSS feed status code: ${response.status}`);
    
    // Parse the XML
    const result = await parseStringPromise(response.data);
    
    // Find all items (articles)
    const articles = [];
    
    // Handle different RSS formats
    const items = result.rss?.channel?.[0]?.item || [];
    
    for (const item of items) {
      const title = item.title?.[0] || "";
      const link = item.link?.[0] || "";
      const description = item.description?.[0] || "";
      const pubDate = item.pubDate?.[0] || "";
      
      // Try to get content if available
      let content = "";
      if (item['content:encoded']) {
        content = item['content:encoded'][0] || "";
      }
      
      // Create a simple article object
      const articleObj = {
        title,
        link,
        description,
        content,
        pubDate
      };
      
      articles.push(articleObj);
    }
    
    console.log(`Found ${articles.length} articles in RSS feed`);
    return articles.slice(0, 15); // Return the 15 most recent articles (increased from 10)
    
  } catch (error) {
    console.error(`Error scraping RSS feed ${url}:`, error);
    return [];
  }
}

/**
 * Scrape an individual article page
 */
async function scrapeArticle(url: string) {
  try {
    const headers = {
      'User-Agent': getRandomUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Referer': new URL(url).origin
    };
    
    const response = await axios.get(url, { 
      headers,
      timeout: 10000, // 10 second timeout
      maxRedirects: 5,
      validateStatus: function (status) {
        return status < 500; // Accept all status codes less than 500
      }
    });
    
    // If we got a non-200 response, log and return empty content
    if (response.status !== 200) {
      console.log(`Got status ${response.status} for ${url}, skipping`);
      return { content: "", imageUrl: null };
    }
    
    const $ = cheerio.load(response.data);
    
    // Extract article content
    let content = "";
    const articleBody = $('article').length ? $('article') : $('main');
    
    if (articleBody.length) {
      const paragraphs = articleBody.find('p');
      content = paragraphs.map((_, el) => $(el).text()).get().join(' ');
    }
    
    // Extract image if available
    let imageUrl = null;
    const mainImage = $('meta[property="og:image"]');
    if (mainImage.length) {
      imageUrl = mainImage.attr('content');
    }
    
    return {
      content,
      imageUrl
    };
  } catch (error) {
    console.error(`Error scraping article ${url}:`, error);
    return { content: "", imageUrl: null };
  }
}

/**
 * Generate a simple summary without using OpenAI API
 */
function generateSimpleSummary(content: string, title: string, maxLength = 150) {
  if (!content || content.length < 20) {
    return `This is an article about ${title}.`;
  }
  
  // Simple extractive summary - take the first few sentences
  const sentences = content.split('.');
  let summary = sentences.slice(0, 3).join('.') + '.';
  
  // Truncate if too long
  if (summary.length > maxLength) {
    summary = summary.substring(0, maxLength) + '...';
  }
  
  return summary;
}

/**
 * Extract simple topics without using OpenAI API
 */
function extractSimpleTopics(content: string, title: string) {
  // Default topics based on the source
  const defaultTopics = ["AI", "Technology", "Machine Learning"];
  
  // Simple keyword-based topic extraction with expanded AI-related keywords
  const keywords: Record<string, string> = {
    // LLM models and companies
    "GPT": "GPT",
    "GPT-4": "GPT-4",
    "GPT-4o": "GPT-4o",
    "Claude": "Claude",
    "Claude 3": "Claude 3",
    "Gemini": "Gemini",
    "Llama": "Llama",
    "Mistral": "Mistral",
    "Anthropic": "Anthropic",
    "OpenAI": "OpenAI",
    "Google AI": "Google AI",
    "Meta AI": "Meta AI",
    "Microsoft": "Microsoft AI",
    "Copilot": "Copilot",
    
    // AI concepts
    "LLM": "LLM",
    "large language model": "LLM",
    "language model": "LLM",
    "multimodal": "Multimodal AI",
    "vision": "Computer Vision",
    "image": "Computer Vision",
    "code": "AI Coding",
    "programming": "AI Coding",
    "safety": "AI Safety",
    "alignment": "AI Alignment",
    "regulation": "AI Regulation",
    "policy": "AI Policy",
    "open source": "Open Source AI",
    "research": "AI Research",
    "hallucination": "AI Hallucinations",
    "fine-tuning": "Model Fine-tuning",
    "prompt": "Prompt Engineering",
    "RAG": "RAG",
    "retrieval": "RAG",
    "augmented": "RAG",
    "embedding": "Embeddings",
    "vector": "Vector Database",
    "transformer": "Transformer",
    "attention": "Attention Mechanism",
    "generative": "Generative AI",
    "diffusion": "Diffusion Models",
    "synthetic": "Synthetic Data",
    "training": "AI Training",
    "inference": "AI Inference",
    "GPU": "AI Hardware",
    "TPU": "AI Hardware",
    "chip": "AI Hardware",
    "ethics": "AI Ethics",
    "bias": "AI Bias",
    "responsible": "Responsible AI",
    "agent": "AI Agents",
    "autonomous": "Autonomous AI"
  };
  
  const foundTopics = new Set<string>();
  
  // Check title and content for keywords
  const textToCheck = (title + " " + content.substring(0, 2000)).toLowerCase();
  
  for (const [keyword, topic] of Object.entries(keywords)) {
    if (textToCheck.includes(keyword.toLowerCase())) {
      foundTopics.add(topic);
    }
  }
  
  // Return found topics or default topics if none found
  let topicsList = Array.from(foundTopics);
  if (topicsList.length < 3) {
    topicsList = [...topicsList, ...defaultTopics];
  }
  
  return topicsList.slice(0, 5); // Return at most 5 topics (increased from 3)
}

/**
 * Scrape all configured sources
 */
export async function scrapeSources(): Promise<Article[]> {
  const allArticles: Article[] = [];
  
  // Process sources sequentially to avoid overwhelming the server
  for (const [sourceName, config] of Object.entries(SOURCES)) {
    console.log(`Scraping ${sourceName}...`);
    
    try {
      if (config.type === "rss") {
        // Handle RSS feed
        const rssArticles = await scrapeRss(config.url, sourceName);
        
        for (const rssArticle of rssArticles) {
          try {
            const title = rssArticle.title;
            const link = rssArticle.link;
            
            if (!title || !link) continue;
            
            // Get additional article details
            const articleDetails = await scrapeArticle(link);
            
            // Combine content from RSS and article page
            const fullContent = rssArticle.content || rssArticle.description || articleDetails.content;
            
            // Generate summary and extract topics
            const summary = generateSimpleSummary(fullContent, title);
            const topics = extractSimpleTopics(fullContent, title);
            
            // Create a safe date (1 hour in the past)
            const now = new Date();
            now.setHours(now.getHours() - 1);
            const safeDate = now.toISOString();
            
            // Create article object
            const article: Article = {
              id: uuidv4(),
              title,
              summary,
              content: fullContent,
              url: link,
              imageUrl: articleDetails.imageUrl || `/placeholder.svg?height=200&width=400&text=${encodeURIComponent(sourceName)}`,
              source: sourceName,
              topics,
              publishedAt: safeDate,
              createdAt: safeDate
            };
            
            allArticles.push(article);
          } catch (error) {
            console.error(`Error processing RSS article:`, error);
          }
        }
      } else if (config.type === "html") {
        // Type assertion to access HTML-specific properties
        const htmlConfig = config as HtmlSource;
        
        // Handle HTML page
        try {
          const headers = {
            'User-Agent': getRandomUserAgent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Referer': new URL(htmlConfig.url).origin
          };
          
          const response = await axios.get(htmlConfig.url, { 
            headers,
            timeout: 15000, // 15 second timeout
            maxRedirects: 5
          });
          const $ = cheerio.load(response.data);
          
          // Find all article elements
          const articleElements = $(htmlConfig.selector);
          
          // Define the article type
          interface HtmlArticle {
            title: string;
            link: string;
          }
          
          // Initialize articles array with proper typing
          const articles: HtmlArticle[] = [];
          
          articleElements.each((_, element) => {
            const titleElement = $(element).find(htmlConfig.title_selector);
            const linkElement = $(element).find(htmlConfig.link_selector);
            
            if (titleElement.length && linkElement.length) {
              const title = titleElement.text().trim();
              let link = linkElement.attr('href');
              
              // Handle relative URLs
              if (link && link.startsWith('/')) {
                link = `${htmlConfig.base_url}${link}`;
              }
              
              if (title && link) {
                articles.push({ title, link });
              }
            }
          });
          
          console.log(`Found ${articles.length} articles for ${sourceName}`);
          
          // Process the first 10 articles
          // Add a small delay between article scraping to avoid rate limiting
          for (const article of articles.slice(0, 10)) {
            try {
              // Get additional article details
              const articleDetails = await scrapeArticle(article.link);
              
              // Generate summary and extract topics
              const summary = generateSimpleSummary(articleDetails.content, article.title);
              const topics = extractSimpleTopics(articleDetails.content, article.title);
              
              // Create a safe date (1 hour in the past)
              const now = new Date();
              now.setHours(now.getHours() - 1);
              const safeDate = now.toISOString();
              
              // Create article object
              const articleObj: Article = {
                id: uuidv4(),
                title: article.title,
                summary,
                content: articleDetails.content,
                url: article.link,
                imageUrl: articleDetails.imageUrl || `/placeholder.svg?height=200&width=400&text=${encodeURIComponent(sourceName)}`,
                source: sourceName,
                topics,
                publishedAt: safeDate,
                createdAt: safeDate
              };
              
              allArticles.push(articleObj);
              
              // Add a small delay between article scraping
              await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
              console.error(`Error processing HTML article:`, error);
            }
          }
        } catch (error) {
          console.error(`Error scraping HTML source ${htmlConfig.url}:`, error);
        }
      }
    } catch (error) {
      console.error(`Error processing source ${sourceName}:`, error);
    }
    
    // Add a delay between sources to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return allArticles;
}

/**
 * Save articles to Redis and in-memory cache
 */
export async function saveArticles(articles: Article[]): Promise<boolean> {
  try {
    // Update in-memory cache
    cachedArticles = articles;
    
    // Save to Redis if available
    const redis = getRedisClient();
    if (redis) {
      await redis.set(ARTICLES_REDIS_KEY, JSON.stringify(articles));
      console.log(`Saved ${articles.length} articles to Redis and in-memory cache`);
      return true;
    } else {
      console.warn('Redis client not available, articles saved only to in-memory cache');
      return true; // Still return true as we saved to in-memory cache
    }
  } catch (error) {
    console.error("Error saving articles:", error);
    return false;
  }
}

/**
 * Get articles from in-memory cache, Redis, or generate fallback articles
 */
export async function getArticles(): Promise<Article[]> {
  // First try in-memory cache
  if (cachedArticles && cachedArticles.length > 0) {
    console.log(`Returning ${cachedArticles.length} articles from in-memory cache`);
    return cachedArticles;
  }
  
  // Then try reading from Redis
  try {
    const redis = getRedisClient();
    if (redis) {
      const articlesJson = await redis.get(ARTICLES_REDIS_KEY);
      
      if (articlesJson) {
        const articles = JSON.parse(articlesJson) as Article[];
        
        // Update in-memory cache
        cachedArticles = articles;
        
        console.log(`Loaded ${articles.length} articles from Redis`);
        return articles;
      }
    }
  } catch (error) {
    console.error("Error reading articles from Redis:", error);
  }
  
  // Otherwise, generate fallback articles
  console.log("No articles in cache or Redis, generating fallback articles");
  return generateFallbackArticles();
}

/**
 * Generate fallback articles for when no real articles are available
 */
function generateFallbackArticles(): Article[] {
  const sources = ["AWS ML", "Wired AI", "AI Blog", "Google AI", "Anthropic", "Hugging Face"];
  const topics = ["LLM", "Computer Vision", "AI Safety", "Multimodal AI", "Research", "Technology"];
  
  // Create a safe date (1 hour in the past)
  const now = new Date();
  now.setHours(now.getHours() - 1);
  const safeDate = now.toISOString();
  
  return Array.from({ length: 10 }, (_, i) => ({
    id: `sample-${i}-${Date.now()}`,
    title: `Sample Article ${i + 1}`,
    summary: `This is a sample article summary for article ${i + 1}. Real articles will appear once the scraper runs.`,
    content: `This is the content of sample article ${i + 1}. It contains information about AI advancements. Real articles will appear once the scraper runs.`,
    url: `https://example.com/article-${i + 1}`,
    imageUrl: `https://placehold.co/600x400?text=AI+Article+${i + 1}`,
    source: sources[i % sources.length],
    topics: [topics[i % topics.length], topics[(i + 1) % topics.length]],
    publishedAt: safeDate,
    createdAt: safeDate
  }));
}

/**
 * Scrape and save articles using Brave Search
 */
export async function scrapeAndSaveArticlesWithBrave() {
  console.log("Fetching articles with Brave Search...");
  
  try {
    // Check if BRAVE_API_KEY is set
    if (!process.env.BRAVE_API_KEY) {
      console.warn('BRAVE_API_KEY not set, skipping Brave Search integration');
      return [];
    }
    
    // Fetch articles using Brave Search - reduced from 10 to 5 articles per source to avoid rate limiting
    const articles = await fetchArticlesWithBrave(5); // 5 articles per source
    
    if (articles.length === 0) {
      console.log('No articles fetched with Brave Search');
      return [];
    }
    
    console.log(`Successfully fetched ${articles.length} articles with Brave Search`);
    return articles;
  } catch (error) {
    console.error('Error scraping articles with Brave Search:', error);
    return [];
  }
}

/**
 * Main function to scrape and save articles from all sources
 */
export async function scrapeAndSaveArticles() {
  console.log("Starting article scraping and saving...");
  
  try {
    // Clear the article cache first to ensure we get fresh articles
    await clearArticleCache();
    
    // Use traditional scraping method
    console.log('Using traditional scraping method');
    const traditionalArticles = await scrapeSources();
    console.log(`Scraped ${traditionalArticles.length} articles from traditional sources`);
    
    if (traditionalArticles.length === 0) {
      console.log("No articles found from traditional sources, using fallback articles");
      const fallbackArticles = generateFallbackArticles();
      await saveArticles(fallbackArticles);
      return { 
        success: false, 
        error: "No articles found from traditional sources", 
        count: fallbackArticles.length 
      };
    }
    
    // Save articles to Redis and in-memory cache
    await saveArticles(traditionalArticles);
    
    return { 
      success: true, 
      message: `Successfully scraped and saved ${traditionalArticles.length} articles`, 
      count: traditionalArticles.length 
    };
  } catch (error) {
    console.error("Error scraping and saving articles:", error);
    return { 
      success: false, 
      error: `Error scraping and saving articles: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

/**
 * Scrape and save articles using MCP (Machine Content Processing)
 */
export async function scrapeAndSaveArticlesWithMcp() {
  console.log("Starting article scraping with MCP...");
  
  try {
    // Clear the article cache first to ensure we get fresh articles
    await clearArticleCache();
    
    // Fetch articles using MCP
    console.log('Using MCP scraping method');
    const mcpArticles = await fetchArticlesWithMCP(10); // 10 articles per source
    console.log(`Fetched ${mcpArticles.length} articles using MCP`);
    
    if (mcpArticles.length === 0) {
      console.log("No articles found from MCP, using fallback articles");
      const fallbackArticles = generateFallbackArticles();
      await saveArticles(fallbackArticles);
      return { 
        success: false, 
        error: "No articles found from MCP", 
        count: fallbackArticles.length 
      };
    }
    
    // Save articles to Redis and in-memory cache
    await saveArticles(mcpArticles);
    
    return { 
      success: true, 
      message: `Successfully scraped and saved ${mcpArticles.length} articles using MCP`, 
      count: mcpArticles.length 
    };
  } catch (error) {
    console.error("Error scraping and saving articles with MCP:", error);
    return { 
      success: false, 
      error: `Error scraping and saving articles with MCP: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

/**
 * Enhanced function to scrape and save articles
 */
export async function refreshArticles() {
  console.log("Starting article refresh...");
  
  try {
    // Clear the article cache first to ensure we get fresh articles
    await clearArticleCache();
    
    // Use traditional scraping only
    console.log('Using traditional scraping method');
    const traditionalArticles = await scrapeSources();
    console.log(`Scraped ${traditionalArticles.length} articles from traditional sources`);
    
    if (traditionalArticles.length === 0) {
      console.log("No articles found, using fallback articles");
      const fallbackArticles = generateFallbackArticles();
      await saveArticles(fallbackArticles);
      return { 
        success: false, 
        error: "No articles found from any source", 
        count: fallbackArticles.length 
      };
    }
    
    // Save articles to Redis and in-memory cache
    await saveArticles(traditionalArticles);
    
    return { 
      success: true, 
      message: `Successfully refreshed and saved ${traditionalArticles.length} articles`, 
      count: traditionalArticles.length 
    };
  } catch (error) {
    console.error("Error refreshing articles:", error);
    return { 
      success: false, 
      error: `Error refreshing articles: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

// Clear the article cache (both Redis and in-memory)
async function clearArticleCache(): Promise<void> {
  console.log("Clearing article cache...");
  
  // Clear in-memory cache
  cachedArticles = [];
  
  // Clear Redis cache if available
  try {
    const redis = getRedisClient();
    if (redis) {
      // Get all article keys
      const keys = await redis.keys('articles_*');
      
      if (keys.length > 0) {
        // Delete all article keys
        await redis.del(...keys);
        console.log(`Cleared ${keys.length} article keys from Redis cache`);
      }
    }
  } catch (error) {
    console.error("Error clearing Redis cache:", error);
  }
} 