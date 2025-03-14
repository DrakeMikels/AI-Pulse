import { NextResponse } from 'next/server';
import { MCPClient } from '@/lib/mcp-client';

export async function GET() {
  try {
    console.log('MCP test endpoint called');
    
    // Get API key from environment variable
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      console.error('API key not found in environment variables');
      return NextResponse.json(
        { error: 'API key not found. Please set ANTHROPIC_API_KEY in your .env.local file.' },
        { status: 500 }
      );
    }
    
    console.log('API key found:', apiKey.substring(0, 5) + '...');
    
    // Initialize the MCP client
    const mcpClient = new MCPClient(apiKey);
    console.log('MCP client initialized');
    
    // Perform a test web search
    console.log('Starting web search...');
    const searchResults = await mcpClient.webSearch('latest AI news from Anthropic');
    console.log(`Search completed, found ${searchResults.length} results`);
    
    // Return the search results
    return NextResponse.json({
      success: true,
      message: 'MCP test successful',
      results: searchResults.slice(0, 3) // Return only the first 3 results to keep the response size reasonable
    });
  } catch (error) {
    console.error('Error in MCP test endpoint:', error);
    return NextResponse.json(
      { error: `MCP test failed: ${error}` },
      { status: 500 }
    );
  }
} 