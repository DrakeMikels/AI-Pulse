import axios from 'axios';
import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';
import { parseStringPromise } from 'xml2js';
import type { Article } from '@/types/article';

// In-memory storage for articles (will be reset on server restart)
let cachedArticles: Article[] = [];

// Define source types
interface BaseSource {
  url: string;
  type: string;
  base_url: string;
}

interface WebSource extends BaseSource {
  type: 'web';
  selector: string;
  title_selector: string;
  link_selector: string;
}

interface RssSource extends BaseSource {
  type: 'rss';
}

type Source = WebSource | RssSource;

// Define sources
const sources: Source[] = [
  {
    url: 'https://www.anthropic.com/news',
    type: 'web',
    selector: 'li, article',
    title_selector: 'h3, h2',
    link_selector: 'a',
    base_url: 'https://www.anthropic.com'
  },
  {
    url: 'https://blog.google/technology/ai/',
    type: 'web',
    selector: 'article',
    title_selector: 'h3, h2',
    link_selector: 'a',
    base_url: 'https://blog.google'
  },
  {
    url: 'https://www.wired.com/feed/tag/ai/latest/rss',
    type: 'rss',
    base_url: 'https://www.wired.com'
  },
  {
    url: 'https://www.artificial-intelligence.blog/ai-news?format=rss',
    type: 'rss',
    base_url: 'https://www.artificial-intelligence.blog'
  }
];

// Define interface for RSS article objects
interface RssArticleItem {
  title?: string;
  link?: string;
  description?: string;
  content?: string;
  pubDate?: string;
}

// Helper function to get a proxied URL to avoid CORS issues
function getProxiedUrl(url: string): string {
  // Use corsproxy.io as a CORS proxy
  return `https://corsproxy.io/?${encodeURIComponent(url)}`;
}

/**
 * Scrape articles from an RSS feed
 */
async function scrapeRss(url: string, sourceName: string): Promise<RssArticleItem[]> {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    };
    
    // Use proxy for the request
    const proxiedUrl = getProxiedUrl(url);
    console.log(`Making proxied RSS request to ${proxiedUrl}...`);
    
    const response = await axios.get(proxiedUrl, { headers });
    console.log(`RSS feed status code: ${response.status}`);
    
    // Parse the XML
    const result = await parseStringPromise(response.data);
    
    // Find all items (articles)
    const articles: RssArticleItem[] = [];
    
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
      const articleObj: RssArticleItem = {
        title,
        link,
        description,
        content,
        pubDate
      };
      
      articles.push(articleObj);
    }
    
    console.log(`Found ${articles.length} articles in RSS feed`);
    return articles.slice(0, 5); // Return the 5 most recent articles
    
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
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    };
    
    // Use proxy for the request
    const proxiedUrl = getProxiedUrl(url);
    console.log(`Making proxied article request to ${proxiedUrl}...`);
    
    const response = await axios.get(proxiedUrl, { headers });
    const $ = cheerio.load(response.data);
    
    // Extract article content
    let content = "";
    
    // Try different selectors to find the main content
    const selectors = [
      'article', 
      'main', 
      '.post-content', 
      '.article-content', 
      '.entry-content', 
      '.content',
      '#content'
    ];
    
    let articleBody;
    
    // Find the first selector that matches
    for (const selector of selectors) {
      if ($(selector).length) {
        articleBody = $(selector);
        break;
      }
    }
    
    // If no selector matched, use the body
    if (!articleBody || !articleBody.length) {
      articleBody = $('body');
    }
    
    // Extract paragraphs
    if (articleBody.length) {
      // Remove unwanted elements
      articleBody.find('script, style, nav, header, footer, .sidebar, .comments, .related, .advertisement').remove();
      
      // Get all paragraphs
      const paragraphs = articleBody.find('p');
      
      if (paragraphs.length) {
        // Extract text from paragraphs
        content = paragraphs.map((_, el) => {
          // Preserve some basic HTML formatting
          const html = $(el).html() || '';
          return html
            .replace(/<br\s*\/?>/g, '\n')  // Convert <br> to newlines
            .replace(/<\/?(b|strong|i|em)>/g, ''); // Remove basic formatting tags
        }).get().join('\n\n');
      } else {
        // If no paragraphs found, get all text
        content = articleBody.text().trim();
      }
    }
    
    // Extract image if available
    let imageUrl = null;
    
    // Try to get the OpenGraph image first
    const ogImage = $('meta[property="og:image"]');
    if (ogImage.length) {
      imageUrl = ogImage.attr('content');
    }
    
    // If no OG image, try other common image selectors
    if (!imageUrl) {
      const mainImage = $('article img, .featured-image img, .post-thumbnail img').first();
      if (mainImage.length) {
        imageUrl = mainImage.attr('src');
      }
    }
    
    // Clean up the content
    content = content
      .replace(/\n{3,}/g, '\n\n')  // Replace multiple newlines with just two
      .replace(/\s{2,}/g, ' ')     // Replace multiple spaces with a single space
      .trim();
    
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
  
  // Simple keyword-based topic extraction
  const keywords: Record<string, string> = {
    "GPT": "GPT",
    "Claude": "Claude",
    "Gemini": "Gemini",
    "LLM": "LLM",
    "language model": "LLM",
    "multimodal": "Multimodal AI",
    "vision": "Computer Vision",
    "image": "Computer Vision",
    "code": "Coding",
    "programming": "Coding",
    "safety": "AI Safety",
    "alignment": "AI Alignment",
    "regulation": "AI Regulation",
    "policy": "AI Policy",
    "open source": "Open Source",
    "research": "Research"
  };
  
  const foundTopics = new Set<string>();
  
  // Check title and content for keywords
  const textToCheck = (title + " " + content.substring(0, 1000)).toLowerCase();
  
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
  
  return topicsList.slice(0, 3); // Return at most 3 topics
}

/**
 * Scrape articles from all sources
 */
async function scrapeArticles(): Promise<Article[]> {
  try {
    const allArticles: Article[] = [];
    console.log(`Starting to scrape ${sources.length} sources...`);

    for (const source of sources) {
      try {
        console.log(`Attempting to scrape source: ${source.url} (type: ${source.type})`);
        let sourceArticles: Article[] = [];

        if (source.type === 'web') {
          console.log(`Making web request to ${source.url}...`);
          try {
            const headers = {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml',
              'Accept-Language': 'en-US,en;q=0.9',
            };
            
            // Use proxy for the request
            const proxiedUrl = getProxiedUrl(source.url);
            console.log(`Making proxied web request to ${proxiedUrl}...`);
            
            const response = await axios.get(proxiedUrl, { 
              headers,
              timeout: 10000, // 10 second timeout
              validateStatus: (status) => true // Accept any status code to log it
            });
            
            console.log(`Response from ${source.url}: status=${response.status}, content-type=${response.headers['content-type']}`);
            
            if (response.status !== 200) {
              console.error(`Error status code ${response.status} from ${source.url}`);
              continue;
            }
            
            const $ = cheerio.load(response.data);
            console.log(`Loaded HTML, looking for selector: ${source.selector}`);
            const elements = $(source.selector);
            console.log(`Found ${elements.length} elements matching selector`);
            
            sourceArticles = $(source.selector)
              .map((_, el) => {
                const title = $(el).find(source.title_selector).text().trim();
                const link = $(el).find(source.link_selector).attr('href');
                console.log(`Found article: title=${title}, link=${link}`);
                const fullLink = link?.startsWith('http') ? link : `${source.base_url}${link}`;
                const currentDate = new Date().toISOString();
                
                return {
                  id: uuidv4(),
                  title,
                  url: fullLink,
                  source: source.url,
                  publishedAt: currentDate,
                  createdAt: currentDate,
                  content: '',
                  summary: '',
                  imageUrl: `/placeholder.svg?height=200&width=400&text=${encodeURIComponent(source.url)}`,
                  topics: [],
                  bookmarked: false
                };
              })
              .get()
              .filter(article => article.title && article.url);
              
            console.log(`Filtered to ${sourceArticles.length} valid articles`);
          } catch (webError: any) {
            console.error(`Error making web request to ${source.url}:`, webError);
            console.error(`Error details: ${webError.message}`);
            if (webError.response) {
              console.error(`Response status: ${webError.response.status}`);
              console.error(`Response headers:`, webError.response.headers);
            }
            continue;
          }
        } else if (source.type === 'rss') {
          console.log(`Making RSS request to ${source.url}...`);
          try {
            const headers = {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              'Accept': 'application/rss+xml,application/xml,text/xml',
            };
            
            // Use proxy for the request
            const proxiedUrl = getProxiedUrl(source.url);
            console.log(`Making proxied RSS request to ${proxiedUrl}...`);
            
            const response = await axios.get(proxiedUrl, { 
              headers,
              timeout: 10000,
              validateStatus: (status) => true
            });
            
            console.log(`RSS response from ${source.url}: status=${response.status}, content-type=${response.headers['content-type']}`);
            
            if (response.status !== 200) {
              console.error(`Error status code ${response.status} from RSS ${source.url}`);
              continue;
            }
            
            // Handle RSS feed
            const rssArticles = await scrapeRss(source.url, source.url);
            console.log(`Found ${rssArticles.length} articles in RSS feed`);
            
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
                
                // Create article object with all required properties
                const article: Article = {
                  id: uuidv4(),
                  title,
                  summary,
                  content: fullContent,
                  url: link,
                  imageUrl: articleDetails.imageUrl || `/placeholder.svg?height=200&width=400&text=${encodeURIComponent(source.url)}`,
                  source: source.url,
                  topics,
                  publishedAt: new Date().toISOString(),
                  createdAt: new Date().toISOString(),
                  bookmarked: false
                };
                
                sourceArticles.push(article);
              } catch (error) {
                console.error(`Error processing RSS article:`, error);
              }
            }
          } catch (rssError: any) {
            console.error(`Error making RSS request to ${source.url}:`, rssError);
            console.error(`Error details: ${rssError.message}`);
            if (rssError.response) {
              console.error(`Response status: ${rssError.response.status}`);
              console.error(`Response headers:`, rssError.response.headers);
            }
            continue;
          }
        }

        // Process the first 5 articles
        console.log(`Processing up to 5 articles from source ${source.url}`);
        for (const article of sourceArticles.slice(0, 5)) {
          try {
            // Get additional article details
            console.log(`Scraping article details from ${article.url}`);
            const articleDetails = await scrapeArticle(article.url);
            
            // Generate summary and extract topics
            const summary = generateSimpleSummary(articleDetails.content, article.title);
            const topics = extractSimpleTopics(articleDetails.content, article.title);
            
            // Create article object
            const articleObj: Article = {
              id: uuidv4(),
              title: article.title,
              summary,
              content: articleDetails.content,
              url: article.url,
              imageUrl: articleDetails.imageUrl || `/placeholder.svg?height=200&width=400&text=${encodeURIComponent(source.url)}`,
              source: article.source,
              topics,
              publishedAt: article.publishedAt,
              createdAt: new Date().toISOString(),
              bookmarked: false
            };
            
            allArticles.push(articleObj);
            console.log(`Successfully processed article: ${article.title}`);
          } catch (error) {
            console.error(`Error processing article ${article.url}:`, error);
          }
        }
      } catch (error) {
        console.error(`Error scraping source ${source.url}:`, error);
      }
    }

    console.log(`Scraping complete. Found ${allArticles.length} articles in total.`);
    return allArticles;
  } catch (error) {
    console.error('Error scraping articles:', error);
    return [];
  }
}

/**
 * Save articles to in-memory cache
 */
export function saveArticles(articles: Article[]): boolean {
  try {
    // Store articles in memory
    cachedArticles = articles;
    console.log(`Saved ${articles.length} articles to in-memory cache`);
    return true;
  } catch (error) {
    console.error("Error saving articles:", error);
    return false;
  }
}

/**
 * Get articles from in-memory cache or generate fallback articles
 */
export function getArticles(): Article[] {
  // If we have cached articles, return them
  if (cachedArticles && cachedArticles.length > 0) {
    console.log(`Returning ${cachedArticles.length} articles from in-memory cache`);
    return cachedArticles;
  }
  
  // Otherwise, generate fallback articles
  console.log("No articles in cache, generating fallback articles");
  return generateFallbackArticles();
}

/**
 * Generate fallback articles for when no real articles are available
 */
function generateFallbackArticles(): Article[] {
  const sources = ["Anthropic", "OpenAI", "Google AI", "Wired AI", "AI Blog"];
  const topics = ["LLM", "Computer Vision", "AI Safety", "Multimodal AI", "Research", "Technology"];
  
  return Array.from({ length: 10 }, (_, i) => ({
    id: `sample-${i}-${Date.now()}`,
    title: `Sample Article ${i + 1}`,
    summary: `This is a sample article summary for article ${i + 1}. Real articles will appear once the scraper runs.`,
    content: `This is the content of sample article ${i + 1}. It contains information about AI advancements. Real articles will appear once the scraper runs.`,
    url: `https://example.com/article-${i + 1}`,
    imageUrl: `https://placehold.co/600x400?text=AI+Article+${i + 1}`,
    source: sources[i % sources.length],
    topics: [topics[i % topics.length], topics[(i + 1) % topics.length]],
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    bookmarked: false
  }));
}

/**
 * Main function to scrape and save articles
 */
export async function scrapeAndSaveArticles() {
  console.log("Starting article refresh...");
  
  try {
    // Scrape articles from all sources
    const articles = await scrapeArticles();
    
    if (articles.length === 0) {
      console.log("No articles found, using fallback articles");
      const fallbackArticles = generateFallbackArticles();
      saveArticles(fallbackArticles);
      return { 
        success: false, 
        error: "No articles found from any source", 
        count: fallbackArticles.length 
      };
    }
    
    // Save the articles
    const saved = saveArticles(articles);
    
    if (!saved) {
      return { 
        success: false, 
        error: "Failed to save articles", 
        count: 0 
      };
    }
    
    return { 
      success: true, 
      count: articles.length 
    };
  } catch (error) {
    console.error("Error in scrapeAndSaveArticles:", error);
    return { 
      success: false, 
      error: String(error), 
      count: 0 
    };
  }
} 