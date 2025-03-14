import axios from 'axios';
import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';
import { parseStringPromise } from 'xml2js';
import { JSDOM } from 'jsdom';
import type { Article } from '@/types/article';
import { cleanArticleContent } from './utils';

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
    url: 'https://openai.com/blog/rss',
    type: 'rss',
    base_url: 'https://openai.com',
    name: 'OpenAI'
  },
  {
    url: 'http://feeds.feedburner.com/blogspot/gJZg',
    type: 'rss',
    base_url: 'https://ai.googleblog.com',
    name: 'Google AI'
  },
  {
    url: 'https://www.microsoft.com/en-us/research/feed',
    type: 'rss',
    base_url: 'https://www.microsoft.com',
    name: 'Microsoft Research'
  },
  {
    url: 'https://bair.berkeley.edu/blog/feed.xml',
    type: 'rss',
    base_url: 'https://bair.berkeley.edu',
    name: 'Berkeley AI Research'
  },
  {
    url: 'https://aws.amazon.com/blogs/machine-learning/feed',
    type: 'rss',
    base_url: 'https://aws.amazon.com',
    name: 'AWS Machine Learning'
  },
  {
    url: 'http://feeds.feedburner.com/nvidiablog',
    type: 'rss',
    base_url: 'https://blogs.nvidia.com',
    name: 'NVIDIA AI'
  },
  {
    url: 'https://medium.com/feed/@karpathy',
    type: 'rss',
    base_url: 'https://medium.com',
    name: 'Andrej Karpathy'
  },
  {
    url: 'https://www.fast.ai/atom.xml',
    type: 'rss',
    base_url: 'https://www.fast.ai',
    name: 'Fast.ai'
  },
  {
    url: 'https://distill.pub/rss.xml',
    type: 'rss',
    base_url: 'https://distill.pub',
    name: 'Distill'
  },
  {
    url: 'https://jalammar.github.io/feed.xml',
    type: 'rss',
    base_url: 'https://jalammar.github.io',
    name: 'Jay Alammar'
  },
  {
    url: 'https://machinelearningmastery.com/blog/feed',
    type: 'rss',
    base_url: 'https://machinelearningmastery.com',
    name: 'ML Mastery'
  },
  {
    url: 'https://www.inference.vc/rss',
    type: 'rss',
    base_url: 'https://www.inference.vc',
    name: 'inFERENCe'
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
  // Using allorigins.win which is more reliable than corsproxy.io
  return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
}

// Helper function to retry failed requests with shorter timeouts
async function fetchWithRetry(url: string, options: any, maxRetries = 2): Promise<any> {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries} for ${url}`);
      // Set a shorter timeout for Vercel serverless functions
      const opts = {
        ...options,
        timeout: 5000 // 5 second timeout
      };
      const response = await axios(url, opts);
      return response;
    } catch (error: any) {
      console.error(`Attempt ${attempt} failed for ${url}: ${error.message}`);
      lastError = error;
      
      // Wait before retrying (shorter delay for serverless)
      if (attempt < maxRetries) {
        const delay = 1000; // 1 second delay
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

    // Process only 2 sources at a time to avoid timeouts
    const sourcesToProcess = sources.slice(0, 2);
    console.log(`Processing ${sourcesToProcess.length} sources in this run...`);

    for (const source of sourcesToProcess) {
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
              method: 'GET',
              validateStatus: (status: number) => true // Accept any status code to log it
            });
            
            console.log(`Response from ${source.url}: status=${response.status}`);
            
            if (response.status !== 200) {
              console.error(`Error status code ${response.status} from ${source.url}`);
              continue;
            }
            
            const $ = cheerio.load(response.data);
            console.log(`Loaded HTML, looking for selector: ${source.selector}`);
            const elements = $(source.selector);
            console.log(`Found ${elements.length} elements matching selector`);
            
            // Process only the first 3 articles to avoid timeouts
            sourceArticles = $(source.selector)
              .slice(0, 3)
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
            console.error(`Error making web request to ${source.url}:`, webError.message);
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
              method: 'GET',
              validateStatus: (status: number) => true
            });
            
            console.log(`RSS response from ${source.url}: status=${response.status}`);
            
            if (response.status !== 200) {
              console.error(`Error status code ${response.status} from RSS ${source.url}`);
              continue;
            }
            
            try {
              // Parse the XML
              const result = await parseStringPromise(response.data);
              
              // Find all items (articles)
              const items = result.rss?.channel?.[0]?.item || [];
              console.log(`Found ${items.length} items in RSS feed`);
              
              // Process only the first 2 items to avoid timeouts
              const limitedItems = items.slice(0, 2);
              
              for (const item of limitedItems) {
                try {
                  const title = item.title?.[0] || "";
                  const link = item.link?.[0] || "";
                  const description = item.description?.[0] || "";
                  
                  if (!title || !link) continue;
                  
                  // Skip detailed article scraping to avoid timeouts
                  // Use the description from the RSS feed directly
                  const summary = description ? 
                    (description.length > 150 ? description.substring(0, 147) + '...' : description) : 
                    `This is an article about ${title} from ${source.name}.`;
                  
                  const topics = extractSimpleTopics(title + ' ' + description, title);
                  
                  // Create article object with minimal processing
                  const article: Article = {
                    id: uuidv4(),
                    title,
                    summary,
                    content: description || `Visit the original article at ${link} to read the full content.`,
                    url: link,
                    imageUrl: `/placeholder.svg?height=200&width=400&text=${encodeURIComponent(source.name)}`,
                    source: source.name,
                    topics,
                    publishedAt: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    bookmarked: false
                  };
                  
                  sourceArticles.push(article);
                  console.log(`Successfully processed RSS article: ${title}`);
                } catch (error) {
                  console.error(`Error processing RSS item:`, error);
                }
              }
            } catch (parseError) {
              console.error(`Error parsing RSS feed:`, parseError);
            }
          } catch (rssError: any) {
            console.error(`Error making RSS request to ${source.url}:`, rssError.message);
            continue;
          }
        }

        // Process only 2 articles per source to avoid timeouts
        console.log(`Processing up to 2 articles from source ${source.url}`);
        for (const article of sourceArticles.slice(0, 2)) {
          try {
            // Skip detailed article scraping to avoid timeouts
            // Instead, use the title and basic info we already have
            const summary = `This is an article about ${article.title} from ${source.name}.`;
            const topics = extractSimpleTopics(article.title, article.title);
            
            // Create article object with minimal processing
            const articleObj: Article = {
              id: uuidv4(),
              title: article.title,
              summary,
              content: `Visit the original article at ${article.url} to read the full content.`,
              url: article.url,
              imageUrl: `/placeholder.svg?height=200&width=400&text=${encodeURIComponent(source.name)}`,
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
  const sources = ["OpenAI", "Google AI", "Microsoft Research", "Berkeley AI Research", 
                  "AWS Machine Learning", "NVIDIA AI", "Andrej Karpathy", "Fast.ai",
                  "Distill", "Jay Alammar", "ML Mastery", "inFERENCe"];
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
    },
    {
      title: "Improving Efficiency in Large Language Models",
      summary: "New techniques for making LLMs faster and more resource-efficient without sacrificing performance.",
      content: "As language models continue to grow in size and capability, efficiency becomes increasingly important. Our latest research focuses on techniques to reduce the computational resources required for both training and inference. Through a combination of pruning, quantization, and distillation methods, we've achieved significant speedups while maintaining most of the performance of larger models. These advances make it possible to deploy powerful AI systems in more constrained environments, from mobile devices to edge computing scenarios."
    },
    {
      title: "Responsible AI Development Framework",
      summary: "A comprehensive approach to developing AI systems that are safe, fair, and beneficial.",
      content: "We're introducing a new framework for responsible AI development that addresses key challenges in safety, fairness, and transparency. This approach integrates evaluation throughout the development lifecycle, from initial design to deployment and monitoring. By systematically identifying and mitigating potential risks, we can build AI systems that better align with human values and societal needs. The framework includes specific metrics, testing methodologies, and governance processes that can be adapted for different AI applications and contexts."
    }
  ];
  
  return Array.from({ length: 12 }, (_, i) => {
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
export async function scrapeAndSaveArticles(): Promise<Article[]> {
  console.log('Starting to scrape articles...');
  
  try {
    // Process only a subset of sources at a time to avoid timeouts
    // For Vercel serverless functions, we need to be very conservative
    const MAX_SOURCES_TO_PROCESS = 3;
    const MAX_ARTICLES_PER_SOURCE = 3;
    
    // Select a random subset of sources to process
    const shuffledSources = [...sources].sort(() => 0.5 - Math.random());
    const sourcesToProcess = shuffledSources.slice(0, MAX_SOURCES_TO_PROCESS);
    
    console.log(`Processing ${sourcesToProcess.length} sources: ${sourcesToProcess.map(s => s.name).join(', ')}`);
    
    // Process each source with a short timeout
    const articlesPromises = sourcesToProcess.map(source => 
      scrapeSource(source, MAX_ARTICLES_PER_SOURCE)
        .catch(error => {
          console.error(`Error scraping ${source.name}:`, error.message);
          return []; // Return empty array on error
        })
    );
    
    // Wait for all sources to be processed
    const articlesArrays = await Promise.all(articlesPromises);
    
    // Flatten the array of arrays
    const newArticles = articlesArrays.flat();
    console.log(`Scraped ${newArticles.length} new articles`);
    
    if (newArticles.length > 0) {
      // Merge with existing articles, avoiding duplicates
      const existingIds = new Set(cachedArticles.map(a => a.id));
      const uniqueNewArticles = newArticles.filter(article => !existingIds.has(article.id));
      
      cachedArticles = [...uniqueNewArticles, ...cachedArticles];
      console.log(`Added ${uniqueNewArticles.length} unique new articles to cache`);
    } else {
      console.log('No new articles found, using fallback articles');
      // If no articles were scraped, use fallback articles
      if (cachedArticles.length === 0) {
        cachedArticles = generateFallbackArticles();
        console.log(`Generated ${cachedArticles.length} fallback articles`);
      }
    }
    
    return cachedArticles;
  } catch (error) {
    console.error('Error in scrapeAndSaveArticles:', error);
    
    // If scraping fails completely, use fallback articles
    if (cachedArticles.length === 0) {
      cachedArticles = generateFallbackArticles();
      console.log(`Generated ${cachedArticles.length} fallback articles after error`);
    }
    
    return cachedArticles;
  }
}

/**
 * Scrape a single source
 */
async function scrapeSource(source: typeof sources[0], maxArticles: number): Promise<Article[]> {
  console.log(`Scraping ${source.name} from ${source.url}`);
  
  try {
    // Set a timeout for the request to avoid hanging
    const response = await axios.get(source.url, { 
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AI-Pulse/1.0; +https://ai-pulse-ten.vercel.app)'
      }
    });
    
    if (source.type === 'rss') {
      return await scrapeRssFeed(response.data, source, maxArticles);
    } else {
      // Web scraping is more complex and prone to timeouts
      // For now, just return an empty array for non-RSS sources
      console.log(`Skipping non-RSS source: ${source.name}`);
      return [];
    }
  } catch (error: unknown) {
    console.error(`Error fetching ${source.name}:`, error instanceof Error ? error.message : String(error));
    return [];
  }
}

/**
 * Parse an RSS feed and extract articles
 */
async function scrapeRssFeed(xmlData: string, source: typeof sources[0], maxArticles: number): Promise<Article[]> {
  try {
    const result = await parseStringPromise(xmlData, { explicitArray: false });
    
    // Handle different RSS formats
    const channel = result.rss?.channel || result.feed;
    if (!channel) {
      console.error(`Invalid RSS format for ${source.name}`);
      return [];
    }
    
    // Get items (different property names in different RSS formats)
    const items = channel.item || channel.entry || [];
    const itemsArray = Array.isArray(items) ? items : [items];
    
    // Process only the first maxArticles
    const limitedItems = itemsArray.slice(0, maxArticles);
    
    return limitedItems.map((item: any) => {
      // Extract the publication date
      const pubDate = item.pubDate || item.published || item.updated || new Date().toISOString();
      
      // Extract the content (different property names in different RSS formats)
      const content = item['content:encoded'] || 
                     item.content || 
                     item.description || 
                     item.summary || 
                     '';
      
      // Clean the content
      const cleanedContent = cleanArticleContent(content);
      
      // Extract the link
      const link = item.link?.href || item.link || '#';
      
      // Create a unique ID
      const id = `${source.name.toLowerCase().replace(/\s+/g, '-')}-${Buffer.from(item.title || 'untitled').toString('base64').substring(0, 10)}`;
      
      return {
        id,
        title: item.title || 'Untitled',
        summary: cleanedContent.substring(0, 150) + '...',
        content: cleanedContent,
        url: typeof link === 'object' ? link._ : link,
        imageUrl: extractImageUrl(cleanedContent) || `https://placehold.co/600x400?text=${encodeURIComponent(source.name)}`,
        source: source.name,
        topics: extractTopics(cleanedContent),
        publishedAt: new Date(pubDate).toISOString(),
        createdAt: new Date().toISOString(),
        bookmarked: false
      };
    });
  } catch (error) {
    console.error(`Error parsing RSS feed for ${source.name}:`, error);
    return [];
  }
}

/**
 * Extract an image URL from HTML content
 */
function extractImageUrl(html: string): string | null {
  try {
    const dom = new JSDOM(html);
    const img = dom.window.document.querySelector('img');
    return img?.src || null;
  } catch (error: unknown) {
    return null;
  }
}

/**
 * Extract topics from article content
 */
function extractTopics(content: string): string[] {
  const topicKeywords: Record<string, string[]> = {
    'LLM': ['llm', 'language model', 'gpt', 'transformer', 'nlp', 'text generation'],
    'Computer Vision': ['vision', 'image', 'object detection', 'segmentation', 'camera'],
    'AI Safety': ['safety', 'alignment', 'ethics', 'responsible ai', 'risk'],
    'Multimodal AI': ['multimodal', 'vision-language', 'text-to-image', 'audio', 'speech'],
    'Research': ['research', 'paper', 'study', 'experiment', 'findings'],
    'Technology': ['technology', 'software', 'hardware', 'product', 'release']
  };
  
  const topics: string[] = [];
  const lowerContent = content.toLowerCase();
  
  // Check for each topic's keywords in the content
  Object.entries(topicKeywords).forEach(([topic, keywords]) => {
    if (keywords.some(keyword => lowerContent.includes(keyword))) {
      topics.push(topic);
    }
  });
  
  // If no topics were found, add a default one
  if (topics.length === 0) {
    topics.push('Technology');
  }
  
  // Limit to 2 topics maximum
  return topics.slice(0, 2);
}

/**
 * Clear the articles cache
 */
export function clearArticlesCache(): void {
  cachedArticles = [];
} 