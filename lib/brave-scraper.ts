import { BraveSearchClient } from './brave-mcp-client';
import type { Article } from '@/types/article';

/**
 * Fetch articles using the Brave Search API
 * @param maxArticlesPerSource Maximum number of articles to fetch per source
 * @returns Array of articles
 */
export async function fetchArticlesWithBrave(maxArticlesPerSource: number = 5): Promise<Article[]> {
  console.log(`Fetching articles with Brave Search, max ${maxArticlesPerSource} per source`);
  
  // Set Brave API key from environment variable
  const braveApiKey = process.env.BRAVE_API_KEY;
  
  if (!braveApiKey) {
    console.error('BRAVE_API_KEY not set, cannot fetch articles with Brave Search');
    return [];
  }
  
  // Initialize the Brave client
  const braveClient = new BraveSearchClient(braveApiKey);
  
  // Connect to the API first
  await braveClient.connect();
  
  // Define sources and their corresponding search queries
  // Using more specific queries that are likely to return relevant AI articles
  const sourceQueries = [
    { 
      name: 'Google AI',
      query: 'Google Gemini AI news'
    },
    { 
      name: 'Anthropic',
      query: 'Anthropic Claude AI latest news'
    },
    { 
      name: 'OpenAI',
      query: 'OpenAI GPT-4 ChatGPT news'
    },
    { 
      name: 'AI Research',
      query: 'artificial intelligence research breakthroughs'
    },
    { 
      name: 'AI Ethics',
      query: 'AI ethics regulation policy news'
    },
    { 
      name: 'NVIDIA AI',
      query: 'NVIDIA AI chips GPU news'
    },
    { 
      name: 'Meta AI',
      query: 'Meta AI Llama news'
    },
    { 
      name: 'Microsoft AI',
      query: 'Microsoft Copilot AI news'
    }
  ];
  
  const allArticles: Article[] = [];
  
  // Function to check if a URL is likely a homepage rather than an article
  const isLikelyHomepage = (url: string): boolean => {
    try {
      // Check if URL ends with domain or has very few path segments
      const urlObj = new URL(url);
      const pathSegments = urlObj.pathname.split('/').filter(Boolean);
      
      // If it's just the domain or has a very short path, it's likely a homepage
      if (pathSegments.length <= 1) {
        return true;
      }
      
      // Check for common homepage indicators
      const homepageIndicators = [
        '/index.html',
        '/home',
        '/main',
        '/blog',
        '/news',
        '/ai',
        '/artificial-intelligence'
      ];
      
      for (const indicator of homepageIndicators) {
        if (urlObj.pathname === indicator || urlObj.pathname.endsWith(indicator)) {
          return true;
        }
      }
      
      // Check for URLs that end with just a slash after the domain
      if (url.match(/https?:\/\/[^\/]+\/$/)) {
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Error parsing URL ${url}:`, error);
      return true; // If we can't parse it, better to skip it
    }
  };
  
  // Function to check if a URL is likely a list/category page
  const isLikelyListPage = (url: string): boolean => {
    try {
      const listIndicators = [
        '/category/',
        '/categories/',
        '/tag/',
        '/tags/',
        '/topic/',
        '/topics/',
        '/search',
        '/list',
        '/directory',
        '/archive',
        '/all-',
        '/index'
      ];
      
      for (const indicator of listIndicators) {
        if (url.includes(indicator)) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      return true; // If we can't check it, better to skip it
    }
  };
  
  // Fetch articles from each source
  for (const { name, query } of sourceQueries) {
    try {
      console.log(`Fetching articles from ${name} using Brave Search...`);
      
      // Perform web search to find articles
      const searchResults = await braveClient.webSearch(query, maxArticlesPerSource * 3); // Fetch more results to account for filtering
      
      // Filter out likely homepages and list pages
      const filteredResults = searchResults.filter(result => 
        !isLikelyHomepage(result.url) && 
        !isLikelyListPage(result.url)
      );
      
      console.log(`Filtered from ${searchResults.length} to ${filteredResults.length} results (removed homepages/list pages)`);
      
      // Process each search result
      let articlesForSource = 0;
      for (const result of filteredResults) {
        if (articlesForSource >= maxArticlesPerSource) break;
        
        try {
          // Fetch and process the article
          const article = await braveClient.fetchArticle(result.url);
          
          // Additional validation to ensure we have meaningful content
          if (article && 
              article.content.length > 300 && // Ensure there's substantial content
              article.title.length > 10 &&    // Ensure there's a meaningful title
              !article.title.includes('404') && // Avoid error pages
              !article.title.toLowerCase().includes('page not found') &&
              !article.title.toLowerCase().includes('access denied') &&
              !article.title.toLowerCase().includes('forbidden') &&
              article.content.split(' ').length > 100) { // At least 100 words
            
            // Set the source to the name we defined
            article.source = name;
            
            // Add AI-related topics if not present
            if (!article.topics.includes('AI')) {
              article.topics.push('AI');
            }
            
            // Check for duplicate articles by comparing titles
            const isDuplicate = allArticles.some(existingArticle => 
              existingArticle.title.toLowerCase() === article.title.toLowerCase() ||
              existingArticle.url === article.url
            );
            
            if (!isDuplicate) {
              allArticles.push(article);
              articlesForSource++;
            } else {
              console.log(`Skipping duplicate article: ${article.title}`);
            }
          } else {
            console.log(`Skipping article with insufficient content: ${result.url}`);
          }
        } catch (error) {
          console.error(`Error processing search result: ${error}`);
        }
      }
      
      console.log(`Added ${articlesForSource} articles from ${name}`);
    } catch (error) {
      console.error(`Error fetching articles from ${name}: ${error}`);
    }
  }
  
  console.log(`Successfully fetched ${allArticles.length} articles with Brave Search`);
  return allArticles;
} 