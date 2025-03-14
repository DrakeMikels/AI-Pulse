import { NextResponse } from 'next/server';
import { BraveSearchClient } from '@/lib/brave-mcp-client';

export async function GET(request: Request) {
  try {
    console.log('Brave search test endpoint called');
    
    // Get the search query from the request
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || 'AI news';
    
    console.log('Search query:', query);
    
    // Initialize the Brave Search client
    const braveApiKey = process.env.BRAVE_API_KEY;
    
    if (!braveApiKey) {
      return NextResponse.json({
        success: false,
        message: 'BRAVE_API_KEY not set'
      }, { status: 400 });
    }
    
    const braveClient = new BraveSearchClient(braveApiKey);
    
    console.log('Brave Search client initialized');
    console.log('Starting web search...');
    
    // Perform the web search
    const results = await braveClient.webSearch(query);
    
    console.log('Search completed, found', results.length, 'results');
    
    // Return the search results
    return NextResponse.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Error in Brave search API route:', error);
    return NextResponse.json({
      success: false,
      message: `Error performing Brave search: ${error}`
    }, { status: 500 });
  }
} 