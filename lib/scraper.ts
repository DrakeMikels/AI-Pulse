import axios from 'axios';
import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { parseStringPromise } from 'xml2js';
import type { Article } from '@/types/article';

// Sources to scrape
const SOURCES = {
  "Anthropic": {
    "url": "https://www.anthropic.com/news",
    "type": "html",
    "selector": "li, article",
    "title_selector": "h3, h2",
    "link_selector": "a",
    "base_url": "https://www.anthropic.com"
  },
  "Google AI": {
    "url": "https://blog.google/technology/ai/",
    "type": "html",
    "selector": "article",
    "title_selector": "h3, h2",
    "link_selector": "a",
    "base_url": "https://blog.google"
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
  }
};

/**
 * Scrape articles from an RSS feed
 */
async function scrapeRss(url: string, sourceName: string) {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    };
    
    const response = await axios.get(url, { headers });
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
    
    const response = await axios.get(url, { headers });
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
 * Scrape all configured sources
 */
export async function scrapeSources(): Promise<Article[]> {
  const allArticles: Article[] = [];
  
  for (const [sourceName, config] of Object.entries(SOURCES)) {
    console.log(`Scraping ${sourceName}...`);
    
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
            publishedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
          };
          
          allArticles.push(article);
        } catch (error) {
          console.error(`Error processing RSS article:`, error);
        }
      }
    } else if (config.type === "html") {
      // Handle HTML page
      try {
        const headers = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        };
        
        const response = await axios.get(config.url, { headers });
        const $ = cheerio.load(response.data);
        
        // Find all article elements
        const articleElements = $(config.selector);
        const articles = [];
        
        articleElements.each((_, element) => {
          const titleElement = $(element).find(config.title_selector);
          const linkElement = $(element).find(config.link_selector);
          
          if (titleElement.length && linkElement.length) {
            const title = titleElement.text().trim();
            let link = linkElement.attr('href');
            
            // Handle relative URLs
            if (link && link.startsWith('/')) {
              link = `${config.base_url}${link}`;
            }
            
            if (title && link) {
              articles.push({ title, link });
            }
          }
        });
        
        // Process the first 5 articles
        for (const article of articles.slice(0, 5)) {
          try {
            // Get additional article details
            const articleDetails = await scrapeArticle(article.link);
            
            // Generate summary and extract topics
            const summary = generateSimpleSummary(articleDetails.content, article.title);
            const topics = extractSimpleTopics(articleDetails.content, article.title);
            
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
              publishedAt: new Date().toISOString(),
              createdAt: new Date().toISOString()
            };
            
            allArticles.push(articleObj);
          } catch (error) {
            console.error(`Error processing HTML article:`, error);
          }
        }
      } catch (error) {
        console.error(`Error scraping HTML source ${config.url}:`, error);
      }
    }
  }
  
  return allArticles;
}

/**
 * Save articles to a JSON file
 */
export async function saveArticles(articles: Article[]) {
  try {
    const dataPath = path.join(process.cwd(), "data", "articles.json");
    
    // Create directory if it doesn't exist
    const dir = path.dirname(dataPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write to file
    fs.writeFileSync(dataPath, JSON.stringify(articles, null, 2));
    console.log(`Saved ${articles.length} articles to ${dataPath}`);
    return true;
  } catch (error) {
    console.error("Error saving articles:", error);
    return false;
  }
}

/**
 * Main function to scrape and save articles
 */
export async function scrapeAndSaveArticles() {
  try {
    const articles = await scrapeSources();
    if (articles.length > 0) {
      await saveArticles(articles);
      return { success: true, count: articles.length };
    } else {
      return { success: false, error: "No articles found" };
    }
  } catch (error) {
    console.error("Error in scrape and save:", error);
    return { success: false, error: String(error) };
  }
} 