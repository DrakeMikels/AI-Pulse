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
  name: string;
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
    base_url: 'https://www.anthropic.com',
    name: 'Anthropic'
  },
  {
    url: 'https://openai.com/blog',
    type: 'web',
    selector: '.post-card',
    title_selector: 'h3',
    link_selector: 'a',
    base_url: 'https://openai.com',
    name: 'OpenAI'
  },
  {
    url: 'https://ai.googleblog.com/',
    type: 'web',
    selector: '.post',
    title_selector: 'h2.title',
    link_selector: 'a.title',
    base_url: 'https://ai.googleblog.com',
    name: 'Google AI'
  },
  {
    url: 'https://www.deepmind.com/blog',
    type: 'web',
    selector: '.result-card',
    title_selector: 'h3',
    link_selector: 'a',
    base_url: 'https://www.deepmind.com',
    name: 'DeepMind'
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
  // Try multiple proxy services for better reliability
  // Using allorigins.win which is more reliable than corsproxy.io
  return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
}

// Helper function to retry failed requests
async function fetchWithRetry(url: string, options: any, maxRetries = 3): Promise<any> {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries} for ${url}`);
      const response = await axios(url, options);
      return response;
    } catch (error: any) {
      console.error(`Attempt ${attempt} failed for ${url}: ${error.message}`);
      lastError = error;
      
      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
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
    
    const response = await fetchWithRetry(proxiedUrl, { 
      headers,
      timeout: 15000,
      method: 'GET'
    });
    
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
    
    const response = await fetchWithRetry(proxiedUrl, { 
      headers,
      timeout: 15000,
      method: 'GET'
    });
    
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
            
            const response = await fetchWithRetry(proxiedUrl, { 
              headers,
              timeout: 15000,
              method: 'GET',
              validateStatus: (status: number) => true // Accept any status code to log it
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
                  source: source.name,
                  publishedAt: currentDate,
                  createdAt: currentDate,
                  content: '',
                  summary: '',
                  imageUrl: `/placeholder.svg?height=200&width=400&text=${encodeURIComponent(source.name)}`,
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
            
            const response = await fetchWithRetry(proxiedUrl, { 
              headers,
              timeout: 15000,
              method: 'GET',
              validateStatus: (status: number) => true
            });
            
            console.log(`RSS response from ${source.url}: status=${response.status}, content-type=${response.headers['content-type']}`);
            
            if (response.status !== 200) {
              console.error(`Error status code ${response.status} from RSS ${source.url}`);
              continue;
            }
            
            // Handle RSS feed
            const rssArticles = await scrapeRss(source.url, source.name);
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
                  imageUrl: articleDetails.imageUrl || `/placeholder.svg?height=200&width=400&text=${encodeURIComponent(source.name)}`,
                  source: source.name,
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
              imageUrl: articleDetails.imageUrl || `/placeholder.svg?height=200&width=400&text=${encodeURIComponent(source.name)}`,
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
  const sources = ["Anthropic", "OpenAI", "Google AI", "DeepMind", "Meta AI", "Hugging Face"];
  const topics = ["LLM", "Computer Vision", "AI Safety", "Multimodal AI", "Research", "Technology"];
  
  // Create more realistic article titles and content
  const articleTemplates = [
    {
      title: "Introducing Our Latest AI Model",
      summary: "We're excited to announce our newest AI model with improved capabilities across various tasks.",
      content: "Today, we're thrilled to announce the release of our latest AI model. This new model demonstrates significant improvements in reasoning, safety, and multimodal capabilities. Through extensive training and evaluation, we've created a system that better understands user intent and provides more helpful, harmless, and honest responses. The model shows particular strength in coding, mathematics, and creative tasks while maintaining robust safeguards against potential misuse."
    },
    {
      title: "Advancing AI Safety Research",
      summary: "Our team has made significant progress in developing new techniques for AI alignment and safety.",
      content: "AI safety remains one of our top priorities as models become more capable. In our latest research, we've developed novel techniques for improving model alignment with human values and reducing potential risks. Our approach combines reinforcement learning from human feedback with new methods for identifying and mitigating harmful outputs. This work represents an important step toward building AI systems that are not only powerful but also safe and aligned with human intentions."
    },
    {
      title: "New Breakthroughs in Multimodal AI",
      summary: "Recent advances in combining vision and language capabilities are opening new possibilities.",
      content: "Our research team has achieved significant breakthroughs in multimodal AI systems that can process both visual and textual information. These models can now understand images with greater detail and accuracy, enabling more natural interactions between humans and AI. Applications range from improved accessibility tools for visually impaired users to advanced content creation assistants. This represents a major step toward AI systems that can perceive and understand the world more like humans do."
    },
    {
      title: "Open-Sourcing Our Latest Tools",
      summary: "We're releasing new tools and datasets to help the AI research community advance the field.",
      content: "Today we're excited to announce that we're open-sourcing several key tools and datasets that have been instrumental in our recent research. By sharing these resources with the broader AI community, we hope to accelerate progress and enable more researchers to contribute to solving important problems in the field. The release includes training infrastructure, evaluation frameworks, and curated datasets that can help benchmark model performance across a range of tasks."
    },
    {
      title: "AI for Scientific Discovery",
      summary: "How our AI systems are helping scientists make new discoveries in biology and chemistry.",
      content: "AI is increasingly becoming an invaluable tool for scientific research. Our models are now being used by scientists to accelerate discoveries in fields like protein folding, drug design, and materials science. By quickly analyzing vast amounts of data and suggesting promising new directions for investigation, AI can help human researchers focus their efforts and make breakthroughs more efficiently. Recent examples include identifying novel antibiotics candidates and predicting the structure of previously unknown proteins."
    }
  ];
  
  return Array.from({ length: 10 }, (_, i) => {
    const template = articleTemplates[i % articleTemplates.length];
    const source = sources[i % sources.length];
    return {
      id: `sample-${i}-${Date.now()}`,
      title: `${source}: ${template.title}`,
      summary: template.summary,
      content: template.content,
      url: `https://example.com/article-${i + 1}`,
      imageUrl: `https://placehold.co/600x400?text=${encodeURIComponent(source)}`,
      source: source,
      topics: [topics[i % topics.length], topics[(i + 1) % topics.length]],
      publishedAt: new Date(Date.now() - i * 86400000).toISOString(), // Stagger dates
      createdAt: new Date().toISOString(),
      bookmarked: false
    };
  });
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