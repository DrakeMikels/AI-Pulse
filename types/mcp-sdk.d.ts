declare module '@modelcontextprotocol/sdk/client' {
  export interface MCPClientOptions {
    apiKey: string;
    model: string;
  }

  export interface GenerateTextOptions {
    prompt: string;
  }

  export interface GenerateTextResponse {
    text: string;
  }

  export interface UseToolsOptions {
    tool: any;
    input: any;
  }

  export interface UseToolsResponse {
    toolResults: Array<{
      output?: {
        results?: any[];
      };
    }>;
  }

  export class MCPClient {
    constructor(options: MCPClientOptions);
    generateText(options: GenerateTextOptions): Promise<GenerateTextResponse>;
    useTools(tools: UseToolsOptions[]): Promise<UseToolsResponse>;
  }
}

declare module '@modelcontextprotocol/sdk/tools/web-search' {
  export interface WebSearchToolOptions {
    // Add any options here if needed
  }

  export interface WebSearchInput {
    query: string;
  }

  export interface WebSearchResult {
    title: string;
    url: string;
    snippet: string;
    published_date?: string;
    source?: string;
  }

  export class WebSearchTool {
    constructor(options?: WebSearchToolOptions);
  }
} 