import type { Article } from '@/types/article';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  published_date?: string;
  source?: string;
}

export class BraveSearchClient {
  private apiKey: string;
  private isConnected: boolean = false;
  private lastRequestTime: number = 0;
  private requestDelay: number = 3000; // Increase to 3 seconds delay between requests
  private retryCount: number = 0;
  private maxRetries: number = 3;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.BRAVE_API_KEY || '';
    if (!this.apiKey) {
      console.warn('No Brave API key provided. Set BRAVE_API_KEY environment variable or pass it to the constructor.');
    }
  }

  /**
   * Initialize connection to Brave Search API
   */ 
  async connect(): Promise<void> {
    // Prevent infinite recursion
    if (this.isConnected) {
      return;
    }
    
    try {
      console.log(`Connecting to Brave Search API with key: ${this.apiKey.substring(0, 5)}...`);
      
      // No actual connection needed for REST API, just validate the API key exists
      if (!this.apiKey) {
        throw new Error('No Brave API key provided');
      }
      
      this.isConnected = true;
      console.log('Connected to Brave Search API');
    } catch (error) {
      console.error('Error connecting to Brave Search API:', error);
      // Set isConnected to true anyway to prevent further connection attempts
      this.isConnected = true;
      throw error;
    }
  }

  /**
   * Wait for rate limit to reset
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.requestDelay) {
      const waitTime = this.requestDelay - timeSinceLastRequest;
      console.log(`Rate limiting: waiting ${waitTime}ms before next request`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Perform a web search using Brave Search API
   * @param query Search query
   * @param count Number of results to return
   * @returns Array of search results
   */
  async webSearch(query: string, count: number = 10): Promise<WebSearchResult[]> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      
      // Wait for rate limit to reset
      await this.waitForRateLimit();
      
      // Use a more specific AI-related query regardless of the input query
      // This ensures we always get AI-related content
      const finalQuery = "artificial intelligence news";
      
      console.log(`Performing Brave web search with query: ${finalQuery}`);
      
      // Use the web search endpoint with specific parameters
      const response = await axios({
        method: 'get',
        url: 'https://api.search.brave.com/res/v1/web/search',
        params: {
          q: finalQuery,
          count: Math.min(count, 15),
          freshness: 'pd', // Past day
          search_lang: 'en'
        },
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': this.apiKey
        },
        timeout: 15000 // 15 second timeout
      });
      
      if (response.status !== 200) {
        console.warn(`Brave Search API returned status ${response.status}`);
        return [];
      }
      
      const data = response.data;
      
      if (!data.web || !data.web.results) {
        console.log('No search results found');
        return [];
      }
      
      const results: WebSearchResult[] = data.web.results.map((result: any) => ({
        title: result.title || 'No title',
        url: result.url || '',
        snippet: result.description || '',
        published_date: new Date().toISOString(),
        source: result.url ? new URL(result.url).hostname : 'Unknown'
      }));
      
      console.log(`Found ${results.length} Brave search results`);
      return results.slice(0, count);
    } catch (error: any) {
      // Handle specific error codes
      if (error.response) {
        const status = error.response.status;
        if (status === 429) {
          console.error('Brave Search API rate limit exceeded. Waiting before retrying...');
          // Increase delay for future requests
          this.requestDelay = Math.min(this.requestDelay * 2, 10000); // Max 10 seconds
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
          return [];
        } else if (status === 422) {
          console.error('Brave Search API invalid request (422). Check query parameters.');
          // Try with a different query
          return this.fallbackSearch(count);
        } else if (status === 403) {
          console.error('Brave Search API access denied (403). Check API key.');
          return [];
        }
      }
      
      console.error('Error performing Brave web search:', error);
      // Return empty array instead of throwing to allow the process to continue
      return [];
    }
  }
  
  /**
   * Fallback search method with simpler parameters
   */
  private async fallbackSearch(count: number): Promise<WebSearchResult[]> {
    try {
      console.log('Trying fallback search with simpler parameters');
      
      // Wait for rate limit to reset
      await this.waitForRateLimit();
      
      // Use the simplest possible query
      const response = await axios({
        method: 'get',
        url: 'https://api.search.brave.com/res/v1/web/search',
        params: {
          q: 'AI news',
          count: Math.min(count, 10)
        },
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': this.apiKey
        },
        timeout: 15000
      });
      
      if (response.status !== 200 || !response.data.web || !response.data.web.results) {
        return [];
      }
      
      const results: WebSearchResult[] = response.data.web.results.map((result: any) => ({
        title: result.title || 'No title',
        url: result.url || '',
        snippet: result.description || '',
        published_date: new Date().toISOString(),
        source: result.url ? new URL(result.url).hostname : 'Unknown'
      }));
      
      console.log(`Found ${results.length} results with fallback search`);
      return results.slice(0, count);
    } catch (error) {
      console.error('Error in fallback search:', error);
      return [];
    }
  }

  /**
   * Fetch and process an article from a URL
   * @param url The URL to fetch
   * @returns Processed article data
   */
  async fetchArticle(url: string): Promise<Article | null> {
    try {
      // Wait for rate limit to reset
      await this.waitForRateLimit();
      
      console.log(`Fetching article from: ${url}`);
      
      // Fetch the content directly
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 15000, // 15 second timeout
        maxRedirects: 5,
        validateStatus: function (status) {
          return status < 500; // Accept all status codes less than 500
        }
      });
      
      // If we got a non-200 response, log and return null
      if (response.status !== 200) {
        console.log(`Got status ${response.status} for ${url}, skipping`);
        return null;
      }
      
      const html = response.data;
      
      // Extract title
      const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
      let title = titleMatch ? titleMatch[1].trim() : 'Unknown Title';
      
      // Clean up title (remove site name, etc.)
      title = title.split('|')[0].split('-')[0].trim();
      if (title.length < 10) {
        // If title is too short after splitting, use the original
        title = titleMatch ? titleMatch[1].trim() : 'Unknown Title';
      }
      
      // Extract content (improved approach)
      const content = this.extractContentFromHtml(html);
      
      // If content is too short, this might not be an article
      if (content.length < 200) {
        console.log(`Content too short (${content.length} chars) for ${url}, might not be an article`);
        return null;
      }
      
      // Extract summary (first paragraph or first 200 chars)
      const summary = content.split('\n\n')[0] || content.substring(0, 200);
      
      // Extract source
      const sourceMatch = url.match(/https?:\/\/(?:www\.)?([^\/]+)/i);
      const source = sourceMatch ? sourceMatch[1] : 'Unknown Source';
      
      // Extract published date from meta tags
      let publishedDate = this.extractPublishedDate(html);
      
      // If no date found, use a safe date (1 hour in the past)
      if (!publishedDate) {
        const now = new Date();
        now.setHours(now.getHours() - 1);
        publishedDate = now;
      }
      
      // Ensure the date is not in the future
      const currentDate = new Date();
      if (publishedDate > currentDate) {
        publishedDate = new Date(currentDate.getTime() - 3600000); // 1 hour ago
      }
      
      const safeDate = publishedDate.toISOString();
      
      // Extract image
      const imageUrl = this.extractImageFromHtml(html);
      
      // Extract topics
      const topics = this.extractTopics(html, title, content);
      
      // Create article object with a UUID instead of using URL as ID
      const id = uuidv4();
      
      return {
        id: id,
        title: title,
        content: content,
        summary: summary,
        url: url,
        source: source,
        publishedAt: safeDate,
        createdAt: safeDate,
        topics: topics,
        imageUrl: imageUrl
      };
    } catch (error) {
      console.error('Error fetching article:', error);
      return null;
    }
  }
  
  /**
   * Extract the main content from HTML (improved)
   */
  private extractContentFromHtml(html: string): string {
    // Remove script, style tags, and comments
    let content = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');
    
    // Try to find the article content
    // Look for common article containers
    const articleContainers = [
      /<article[^>]*>([\s\S]*?)<\/article>/i,
      /<div[^>]*class="[^"]*article[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class="[^"]*post[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*id="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class="[^"]*entry[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<main[^>]*>([\s\S]*?)<\/main>/i
    ];
    
    let articleContent = '';
    for (const pattern of articleContainers) {
      const match = content.match(pattern);
      if (match && match[1]) {
        articleContent = match[1];
        break;
      }
    }
    
    // If we found article content, use that, otherwise use the whole body
    if (articleContent) {
      content = articleContent;
    } else {
      const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch && bodyMatch[1]) {
        content = bodyMatch[1];
      }
    }
    
    // Extract text from paragraphs
    const paragraphRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    const paragraphs: string[] = [];
    let match;
    
    while ((match = paragraphRegex.exec(content)) !== null) {
      // Remove HTML tags from paragraph content
      const text = match[1].replace(/<[^>]*>/g, '').trim();
      if (text && text.length > 20) { // Only include paragraphs with substantial content
        paragraphs.push(text);
      }
    }
    
    // If we couldn't find paragraphs, try to extract text from divs
    if (paragraphs.length === 0) {
      const divRegex = /<div[^>]*>([\s\S]*?)<\/div>/gi;
      while ((match = divRegex.exec(content)) !== null) {
        const text = match[1].replace(/<[^>]*>/g, '').trim();
        if (text && text.length > 30) { // Higher threshold for divs
          paragraphs.push(text);
        }
      }
    }
    
    return paragraphs.join('\n\n');
  }
  
  /**
   * Extract the published date from HTML
   */
  private extractPublishedDate(html: string): Date | null {
    // Try to find published date in meta tags
    const metaPatterns = [
      /<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]*name=["']pubdate["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]*name=["']publishdate["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]*name=["']date["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]*property=["']og:published_time["'][^>]*content=["']([^"']+)["'][^>]*>/i
    ];
    
    for (const pattern of metaPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        try {
          return new Date(match[1]);
        } catch (e) {
          // Invalid date format, continue to next pattern
        }
      }
    }
    
    // Try to find date in the HTML content
    const datePatterns = [
      /<time[^>]*datetime=["']([^"']+)["'][^>]*>/i,
      /<span[^>]*class=["']date["'][^>]*>([\d\/\-\.]+)/i,
      /<div[^>]*class=["'][^"']*date[^"']*["'][^>]*>([\d\/\-\.]+)/i
    ];
    
    for (const pattern of datePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        try {
          return new Date(match[1]);
        } catch (e) {
          // Invalid date format, continue to next pattern
        }
      }
    }
    
    return null;
  }
  
  /**
   * Extract image URL from HTML
   */
  private extractImageFromHtml(html: string): string | null {
    // Try to find og:image meta tag
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    if (ogImageMatch && ogImageMatch[1]) {
      return ogImageMatch[1];
    }
    
    // Try to find twitter:image meta tag
    const twitterImageMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    if (twitterImageMatch && twitterImageMatch[1]) {
      return twitterImageMatch[1];
    }
    
    // Try to find first image in content
    const imgMatch = html.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/i);
    if (imgMatch && imgMatch[1]) {
      return imgMatch[1];
    }
    
    return null;
  }
  
  /**
   * Extract topics from HTML and content
   */
  private extractTopics(html: string, title: string, content: string): string[] {
    const topics: Set<string> = new Set(['AI', 'Technology']);
    
    // Common AI-related topics
    const topicKeywords: Record<string, string[]> = {
      'Machine Learning': ['machine learning', 'ml', 'deep learning', 'neural network'],
      'Natural Language Processing': ['nlp', 'language model', 'gpt', 'llm', 'large language model'],
      'Computer Vision': ['computer vision', 'image recognition', 'object detection'],
      'AI Ethics': ['ai ethics', 'responsible ai', 'ethical ai', 'bias'],
      'Generative AI': ['generative ai', 'text-to-image', 'diffusion', 'stable diffusion', 'midjourney'],
      'Robotics': ['robot', 'robotics', 'autonomous'],
      'Research': ['research', 'paper', 'study', 'researchers'],
      'Business': ['business', 'enterprise', 'company', 'startup', 'industry'],
      'Education': ['education', 'learning', 'student', 'university'],
      'Healthcare': ['healthcare', 'medical', 'diagnosis', 'patient'],
      'Policy': ['policy', 'regulation', 'law', 'governance']
    };
    
    // Combine title and first part of content for topic extraction
    const textToAnalyze = (title + ' ' + content.substring(0, 2000)).toLowerCase();
    
    // Check for topic keywords
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      for (const keyword of keywords) {
        if (textToAnalyze.includes(keyword)) {
          topics.add(topic);
          break;
        }
      }
    }
    
    // Check for company/organization names
    const organizations = [
      'Google', 'OpenAI', 'Anthropic', 'Microsoft', 'Meta', 'AWS', 'Amazon', 
      'Hugging Face', 'NVIDIA', 'IBM', 'DeepMind', 'Claude', 'GPT', 'Gemini'
    ];
    
    for (const org of organizations) {
      if (textToAnalyze.includes(org.toLowerCase())) {
        topics.add(org);
      }
    }
    
    // Limit to 5 topics maximum
    return Array.from(topics).slice(0, 5);
  }
} 