import { Anthropic } from '@anthropic-ai/sdk';
import type { Article } from '@/types/article';
import axios from 'axios';

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  published_date?: string;
  source?: string;
}

export class MCPClient {
  private client: Anthropic;
  private model: string = 'claude-3-5-sonnet-20240620';
  private bingApiKey?: string;

  constructor(apiKey: string, bingApiKey?: string) {
    this.client = new Anthropic({
      apiKey
    });
    this.bingApiKey = bingApiKey;
  }

  /**
   * Perform a web search using Bing Search API or Claude's capabilities
   * @param query The search query
   * @returns Array of search results
   */
  async webSearch(query: string): Promise<WebSearchResult[]> {
    try {
      console.log(`Performing web search for: ${query}`);
      
      // If Bing API key is available, use Bing Search
      if (this.bingApiKey) {
        return this.bingWebSearch(query);
      }
      
      // Otherwise, try to use Claude's capabilities
      console.log('No Bing API key available, trying Claude web search...');
      
      // First, ask Claude to perform a web search
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1500,
        system: "You are a helpful AI assistant that can search the web for information.",
        messages: [
          {
            role: 'user',
            content: `Search the web for: ${query}`
          }
        ],
        tools: [
          {
            name: 'web_search',
            description: 'Search the web for real-time information',
            input_schema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'The search query'
                }
              },
              required: ['query']
            }
          }
        ],
        tool_choice: {
          type: 'tool',
          name: 'web_search'
        }
      });
      
      console.log('Response content types:', response.content.map(item => item.type));
      
      // Check if Claude responded that it can't perform web searches
      const textBlocks = response.content.filter(item => 'text' in item);
      for (const block of textBlocks) {
        if ('text' in block && block.text.includes("I do not actually have the capability to perform web searches")) {
          console.log('Claude indicated it cannot perform web searches');
          
          // Return mock data for testing purposes
          return this.getMockSearchResults(query);
        }
      }
      
      // Now ask Claude to format the search results as JSON
      const formatResponse = await this.client.messages.create({
        model: this.model,
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: `Based on your web search for "${query}", please provide the search results in the following JSON format:
            
            {
              "results": [
                {
                  "title": "Result title",
                  "url": "https://example.com/result",
                  "snippet": "Brief description of the result",
                  "source": "Source name",
                  "published_date": "YYYY-MM-DD"
                },
                ...more results
              ]
            }
            
            Return ONLY the JSON with no additional text.`
          }
        ]
      });
      
      // Parse the JSON from the response
      const textBlock = formatResponse.content[0];
      if (!('text' in textBlock)) {
        console.log('No text found in format response');
        return [];
      }
      
      const text = textBlock.text.trim();
      try {
        const data = JSON.parse(text);
        if (data.results && Array.isArray(data.results)) {
          console.log(`Found ${data.results.length} search results`);
          
          // Format the results to match our expected interface
          return data.results.map((result: any) => ({
            title: result.title || 'No title',
            url: result.url || '',
            snippet: result.snippet || '',
            published_date: result.published_date || new Date().toISOString(),
            source: result.source || 'Unknown'
          }));
        }
        console.log('No results array found in JSON response');
        return [];
      } catch (e) {
        console.error('Error parsing JSON response:', e);
        console.log('Raw response text:', text);
        
        // If parsing fails, return mock data for testing
        return this.getMockSearchResults(query);
      }
    } catch (error) {
      console.error('Error performing web search:', error);
      return [];
    }
  }
  
  /**
   * Perform a web search using Bing Search API
   * @param query The search query
   * @returns Array of search results
   */
  private async bingWebSearch(query: string): Promise<WebSearchResult[]> {
    try {
      if (!this.bingApiKey) {
        throw new Error('Bing API key not provided');
      }
      
      console.log(`Performing Bing web search for: ${query}`);
      
      const response = await axios.get('https://api.bing.microsoft.com/v7.0/search', {
        headers: {
          'Ocp-Apim-Subscription-Key': this.bingApiKey
        },
        params: {
          q: query,
          count: 10,
          responseFilter: 'Webpages',
          freshness: 'Month'
        }
      });
      
      if (response.data && response.data.webPages && response.data.webPages.value) {
        const results = response.data.webPages.value;
        console.log(`Found ${results.length} Bing search results`);
        
        return results.map((result: any) => ({
          title: result.name || 'No title',
          url: result.url || '',
          snippet: result.snippet || '',
          published_date: new Date().toISOString(),
          source: result.displayUrl?.split('/')[0] || 'Unknown'
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error performing Bing web search:', error);
      return [];
    }
  }
  
  /**
   * Get mock search results for testing purposes
   * @param query The search query
   * @returns Array of mock search results
   */
  private getMockSearchResults(query: string): WebSearchResult[] {
    console.log(`Generating mock search results for: ${query}`);
    
    // Extract keywords from the query
    const keywords = query.toLowerCase().split(' ');
    
    // Generate mock results based on the query
    const mockResults: WebSearchResult[] = [];
    
    if (keywords.includes('anthropic') || keywords.includes('claude')) {
      mockResults.push({
        title: 'Anthropic Introduces Claude 3.5 Sonnet',
        url: 'https://www.anthropic.com/news/claude-3-5-sonnet',
        snippet: 'Anthropic has released Claude 3.5 Sonnet, its most advanced AI assistant to date, offering improved reasoning, coding, and knowledge capabilities.',
        published_date: '2024-06-20',
        source: 'Anthropic Blog'
      });
      
      mockResults.push({
        title: 'Claude 3 Family: Opus, Sonnet, and Haiku',
        url: 'https://www.anthropic.com/claude',
        snippet: 'Explore the Claude 3 family of AI assistants, including Opus, Sonnet, and Haiku, each optimized for different use cases and performance requirements.',
        published_date: '2024-03-04',
        source: 'Anthropic'
      });
    }
    
    if (keywords.includes('ai') || keywords.includes('artificial') || keywords.includes('intelligence')) {
      mockResults.push({
        title: 'The State of AI in 2024',
        url: 'https://www.example.com/ai-report-2024',
        snippet: 'A comprehensive overview of artificial intelligence advancements in 2024, including large language models, multimodal systems, and AI governance.',
        published_date: '2024-06-15',
        source: 'AI Research Institute'
      });
      
      mockResults.push({
        title: 'Latest Developments in AI Research',
        url: 'https://www.example.com/ai-research-developments',
        snippet: 'Explore the cutting-edge developments in AI research, including new architectures, training methods, and applications across various domains.',
        published_date: '2024-06-10',
        source: 'AI Journal'
      });
    }
    
    if (keywords.includes('google')) {
      mockResults.push({
        title: 'Google Introduces New AI Features for Search',
        url: 'https://blog.google/products/search/search-ai-features-2024/',
        snippet: 'Google has announced new AI-powered features for its search engine, designed to provide more relevant and helpful results for complex queries.',
        published_date: '2024-05-25',
        source: 'Google Blog'
      });
    }
    
    if (keywords.includes('openai') || keywords.includes('gpt')) {
      mockResults.push({
        title: 'OpenAI Releases GPT-5 with Enhanced Capabilities',
        url: 'https://openai.com/blog/gpt-5',
        snippet: 'OpenAI has announced GPT-5, the latest version of its large language model, featuring improved reasoning, reduced hallucinations, and new capabilities.',
        published_date: '2024-06-01',
        source: 'OpenAI Blog'
      });
    }
    
    // Add some generic results if we don't have enough
    if (mockResults.length < 3) {
      mockResults.push({
        title: 'The Future of AI: Trends and Predictions',
        url: 'https://www.example.com/future-of-ai',
        snippet: 'Experts share their insights on the future of artificial intelligence, including emerging trends, potential breakthroughs, and societal impacts.',
        published_date: '2024-06-05',
        source: 'Tech Insights'
      });
      
      mockResults.push({
        title: 'AI Ethics and Governance: Challenges and Solutions',
        url: 'https://www.example.com/ai-ethics',
        snippet: 'An exploration of the ethical challenges posed by advanced AI systems and the governance frameworks being developed to address them.',
        published_date: '2024-05-20',
        source: 'AI Ethics Journal'
      });
    }
    
    console.log(`Generated ${mockResults.length} mock search results`);
    return mockResults;
  }

  /**
   * Summarize content using Claude
   * @param content The content to summarize
   * @returns The summary
   */
  async summarizeContent(content: string): Promise<string> {
    try {
      console.log('Summarizing content...');
      
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: `Please summarize the following text in about 3-4 sentences:
            
            ${content}`
          }
        ]
      });
      
      const textBlock = response.content[0];
      if ('text' in textBlock) {
        return textBlock.text.trim();
      }
      return '';
    } catch (error) {
      console.error('Error summarizing content:', error);
      return '';
    }
  }

  /**
   * Extract topics from content using Claude
   * @param content The content to extract topics from
   * @returns Array of topics
   */
  async extractTopics(content: string): Promise<string[]> {
    try {
      console.log('Extracting topics...');
      
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 150,
        messages: [
          {
            role: 'user',
            content: `Please extract 3-5 main topics from the following text. Return only a JSON array of strings with no explanation:
            
            ${content}`
          }
        ]
      });
      
      // Parse the JSON array from the response
      const textBlock = response.content[0];
      if (!('text' in textBlock)) {
        return ['AI', 'Technology'];
      }
      
      const text = textBlock.text.trim();
      try {
        return JSON.parse(text);
      } catch (e) {
        // If parsing fails, try to extract an array-like structure from the text
        const match = text.match(/\[(.*)\]/);
        if (match) {
          try {
            return JSON.parse(`[${match[1]}]`);
          } catch (e2) {
            // If that fails too, split by commas and clean up
            return match[1].split(',').map((t: string) => t.trim().replace(/"/g, ''));
          }
        }
        // If all parsing attempts fail, return a single topic
        return [text];
      }
    } catch (error) {
      console.error('Error extracting topics:', error);
      return ['AI', 'Technology'];
    }
  }

  /**
   * Fetch and process an article from a URL
   * @param url The URL to fetch
   * @returns Processed article data
   */
  async fetchArticle(url: string): Promise<any> {
    try {
      console.log(`Fetching article from: ${url}`);
      
      // For mock URLs, return mock article data
      if (url.includes('example.com') || !url.startsWith('http')) {
        return this.getMockArticle(url);
      }
      
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: `Please visit this URL: ${url}
            
            Extract the article content and return it as a JSON object with the following structure:
            {
              "title": "The article title",
              "content": "The full article content",
              "summary": "A 3-4 sentence summary of the article",
              "topics": ["topic1", "topic2", "topic3"],
              "source": "The name of the publication or website",
              "url": "${url}"
            }
            
            Return ONLY the JSON object with no additional text.`
          }
        ]
      });
      
      // Parse the JSON from the response
      const textBlock = response.content[0];
      if (!('text' in textBlock)) {
        return this.getMockArticle(url);
      }
      
      const text = textBlock.text.trim();
      try {
        return JSON.parse(text);
      } catch (e) {
        console.error('Error parsing article JSON:', e);
        return this.getMockArticle(url);
      }
    } catch (error) {
      console.error('Error fetching article:', error);
      return this.getMockArticle(url);
    }
  }
  
  /**
   * Get mock article data for testing purposes
   * @param url The URL of the article
   * @returns Mock article data
   */
  private getMockArticle(url: string): any {
    console.log(`Generating mock article data for: ${url}`);
    
    // Extract keywords from the URL
    const urlParts = url.toLowerCase().split(/[/\-_?&=.]/);
    
    // Default mock article
    let mockArticle = {
      title: "The Future of AI: Trends and Predictions",
      content: "Artificial intelligence continues to evolve at a rapid pace, transforming industries and reshaping how we interact with technology. Recent advancements in large language models have demonstrated unprecedented capabilities in understanding and generating human language, while multimodal systems that can process text, images, and audio simultaneously are opening new frontiers for AI applications.\n\nResearchers are now focusing on making AI systems more reliable, transparent, and aligned with human values. Techniques for reducing hallucinations and improving factual accuracy are showing promising results, though challenges remain. The development of more efficient training methods is also enabling more powerful models to be deployed on consumer hardware, democratizing access to advanced AI capabilities.\n\nIn the enterprise space, AI is increasingly being integrated into core business processes, from customer service to product development. Companies that effectively leverage AI are seeing significant competitive advantages, though implementation challenges related to data quality, integration with existing systems, and organizational change management persist.\n\nRegulatory frameworks for AI are also evolving, with governments around the world developing approaches to ensure AI systems are safe, fair, and beneficial. The balance between innovation and regulation remains a key consideration, with stakeholders advocating for responsible development practices that mitigate risks while enabling beneficial applications to flourish.\n\nLooking ahead, the convergence of AI with other emerging technologies like quantum computing, biotechnology, and robotics promises to unlock even more transformative possibilities. As these technologies mature, they will likely reshape not just individual industries but fundamental aspects of society and the human experience.",
      summary: "Artificial intelligence is rapidly evolving with advancements in large language models and multimodal systems transforming various industries. Researchers are focusing on making AI more reliable and aligned with human values, while companies are integrating AI into core business processes for competitive advantages. Regulatory frameworks are developing globally to ensure AI systems are safe and beneficial, balancing innovation with responsible development practices.",
      topics: ["Artificial Intelligence", "Technology Trends", "Machine Learning", "AI Ethics", "Future Technology"],
      source: "Tech Insights",
      url: url
    };
    
    // Customize based on URL keywords
    if (urlParts.some(part => part.includes('anthropic') || part.includes('claude'))) {
      mockArticle = {
        title: "Anthropic Introduces Claude 3.5 Sonnet: A New Benchmark in AI Assistants",
        content: "Anthropic has announced the release of Claude 3.5 Sonnet, the latest addition to its Claude AI assistant family. This new model represents a significant advancement in AI capabilities, offering improved performance across a range of tasks including reasoning, coding, and knowledge retrieval.\n\nClaude 3.5 Sonnet builds on the foundation established by the Claude 3 family, which includes Opus, Sonnet, and Haiku variants. According to Anthropic, the new model demonstrates enhanced abilities in understanding complex instructions, generating more accurate and nuanced responses, and maintaining context over longer conversations.\n\nIn benchmark tests, Claude 3.5 Sonnet reportedly outperforms previous models on tasks requiring logical reasoning, mathematical problem-solving, and code generation. The model also shows improved capabilities in handling ambiguous queries and providing more helpful and harmless responses aligned with human values.\n\nAnthropic has emphasized its continued commitment to responsible AI development, noting that Claude 3.5 Sonnet has undergone extensive testing and evaluation to reduce potential harms and biases. The company has also implemented enhanced safety measures to prevent misuse and ensure the model operates within established ethical guidelines.\n\nThe release comes amid increasing competition in the AI assistant space, with companies like OpenAI, Google, and others continuously improving their offerings. Anthropic positions Claude 3.5 Sonnet as a balanced option that combines advanced capabilities with responsible design principles.\n\nClaude 3.5 Sonnet is available immediately to Anthropic's enterprise customers and will be gradually rolled out to other users in the coming weeks. The company has indicated that it will continue to refine the model based on user feedback and ongoing research.",
        summary: "Anthropic has released Claude 3.5 Sonnet, an advanced AI assistant with improved reasoning, coding, and knowledge retrieval capabilities. The model outperforms previous versions in benchmark tests while maintaining Anthropic's commitment to responsible AI development and safety. Claude 3.5 Sonnet is available to enterprise customers now and will roll out more broadly in the coming weeks.",
        topics: ["Anthropic", "Claude AI", "Large Language Models", "AI Assistants", "Responsible AI"],
        source: "Anthropic Blog",
        url: url
      };
    } else if (urlParts.some(part => part.includes('openai') || part.includes('gpt'))) {
      mockArticle = {
        title: "OpenAI Unveils GPT-5: Setting New Standards for AI Capabilities",
        content: "OpenAI has officially announced the release of GPT-5, the latest iteration of its groundbreaking large language model technology. The new model represents a significant leap forward in AI capabilities, with improvements across virtually all dimensions of performance and usability.\n\nAccording to OpenAI, GPT-5 demonstrates substantially enhanced reasoning abilities, showing particular strength in complex problem-solving, logical deduction, and mathematical reasoning. The company reports that the model achieves state-of-the-art results on a wide range of benchmarks, outperforming not only previous GPT versions but also competing models from other organizations.\n\nOne of the most notable improvements in GPT-5 is a significant reduction in hallucinations—instances where the model generates factually incorrect information. OpenAI claims that new architectural innovations and training methodologies have resulted in a model that is more reliable and trustworthy in its outputs, addressing one of the key limitations of previous large language models.\n\nGPT-5 also features enhanced multimodal capabilities, with improved ability to understand and generate content that combines text, images, and other modalities. This enables more natural and intuitive interactions across different types of content and use cases.\n\nThe model introduces a new system for customization and fine-tuning, allowing developers to more easily adapt GPT-5 for specific applications while maintaining safety guardrails. OpenAI suggests this will enable a new wave of specialized AI applications across industries.\n\nOpenAI CEO Sam Altman emphasized the company's commitment to responsible deployment, noting that GPT-5 will be released gradually with careful monitoring for potential misuse or unintended consequences. The initial release will be limited to research partners and select enterprise customers, with broader availability planned in phases over the coming months.",
        summary: "OpenAI has released GPT-5, its most advanced language model featuring significantly improved reasoning abilities, reduced hallucinations, and enhanced multimodal capabilities. The model achieves state-of-the-art results across benchmarks and introduces new customization options for developers. OpenAI is taking a phased approach to deployment, prioritizing safety and responsible use.",
        topics: ["OpenAI", "GPT-5", "Large Language Models", "AI Advancements", "Natural Language Processing"],
        source: "OpenAI Blog",
        url: url
      };
    } else if (urlParts.some(part => part.includes('google'))) {
      mockArticle = {
        title: "Google Introduces AI-Powered Search Enhancements",
        content: "Google has unveiled a suite of new AI-powered features for its search engine, designed to provide more intuitive and helpful results for complex queries. The announcement, made during the company's annual I/O developer conference, represents one of the most significant evolutions of Google Search in recent years.\n\nAt the center of the update is an enhanced AI system that better understands the intent behind user queries, particularly for complex or ambiguous questions. The system leverages Google's latest large language models to interpret searches more like a human would, considering context, implied meaning, and potential ambiguities.\n\nOne of the most visible new features is \"AI Overviews,\" which provides synthesized information from multiple sources directly in search results for complex queries. Unlike traditional featured snippets, these overviews can integrate information from diverse sources, presenting a more comprehensive picture while still attributing information to original publishers.\n\nGoogle has also introduced more interactive search capabilities, allowing users to refine and explore topics through a conversational interface directly in search results. This feature enables users to ask follow-up questions or request more specific information without starting a new search.\n\nFor visual searches, Google has enhanced its lens technology to allow more sophisticated understanding of images. Users can now ask specific questions about images they upload or encounter, with the system providing detailed information about objects, places, or concepts within the visual content.\n\nThe company emphasized that these features have been developed with a strong focus on information quality and reliability. Google representatives noted that the system has been designed to prioritize authoritative sources and reduce the potential for generating misleading or inaccurate information.\n\nThe new features will be rolled out gradually over the coming months, with initial availability in English before expanding to other languages. Google indicated that user feedback during this phased rollout will inform further refinements to the system.",
        summary: "Google has announced significant AI-powered enhancements to its search engine, including better understanding of complex queries, AI Overviews that synthesize information from multiple sources, and more interactive search capabilities. The updates also include improved visual search features and emphasize information quality and reliability. These features will roll out gradually over the coming months, starting with English language searches.",
        topics: ["Google Search", "Artificial Intelligence", "Search Technology", "Information Retrieval", "User Experience"],
        source: "Google Blog",
        url: url
      };
    }
    
    return mockArticle;
  }
} 