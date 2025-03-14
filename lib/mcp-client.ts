import axios from 'axios';

// MCP client for Anthropic's Claude
export class MCPClient {
  private apiKey: string;
  private baseUrl: string;
  
  constructor(apiKey: string, baseUrl: string = 'https://api.anthropic.com/v1/mcp') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }
  
  /**
   * Perform a web search using MCP
   */
  async webSearch(query: string, maxResults: number = 5): Promise<WebSearchResult[]> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/tools/web_search`,
        {
          query,
          max_results: maxResults
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01' // Update this as needed
          }
        }
      );
      
      return response.data.results || [];
    } catch (error) {
      console.error('Error performing MCP web search:', error);
      return [];
    }
  }
  
  /**
   * Generate a summary of an article using Claude
   */
  async summarizeContent(content: string, maxLength: number = 150): Promise<string> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/messages`,
        {
          model: 'claude-3-sonnet-20240229',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: `Please summarize the following article in about ${maxLength} words. Focus on the key points and main takeaways:
              
              ${content}`
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01' // Update this as needed
          }
        }
      );
      
      return response.data.content || '';
    } catch (error) {
      console.error('Error generating summary with MCP:', error);
      return '';
    }
  }
  
  /**
   * Extract topics from content using Claude
   */
  async extractTopics(content: string, title: string): Promise<string[]> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/messages`,
        {
          model: 'claude-3-sonnet-20240229',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: `Extract 3-5 relevant topics or tags from this article title and content. Return only the topics as a comma-separated list with no additional text.
              
              Title: ${title}
              Content: ${content}`
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01' // Update this as needed
          }
        }
      );
      
      // Parse the comma-separated list into an array
      const topicsText = response.data.content || '';
      return topicsText.split(',').map(topic => topic.trim()).filter(Boolean);
    } catch (error) {
      console.error('Error extracting topics with MCP:', error);
      return ['AI', 'Technology'];
    }
  }
}

// Types for MCP responses
export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  published_date?: string;
  source?: string;
} 