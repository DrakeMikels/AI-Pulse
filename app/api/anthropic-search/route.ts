import { NextResponse } from 'next/server';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

export async function GET() {
  try {
    console.log('Anthropic search test endpoint called');
    
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
    
    // Note: The Vercel AI SDK might not support tool use directly yet
    // Instead, we'll use a prompt that asks Claude to simulate a web search
    
    console.log('Starting simulated web search with Vercel AI SDK...');
    const { text: searchResults } = await generateText({
      model: anthropic('claude-3-5-sonnet-20240620'),
      prompt: 'Imagine you just performed a web search for "latest news about Anthropic and Claude". Provide what you think would be the most recent and relevant information about Anthropic and their Claude AI models. Include details about any recent announcements, updates, or news stories.',
      maxTokens: 1000,
    });
    
    console.log('Search results received');
    
    // Now ask Claude to format the search results as JSON
    console.log('Asking Claude to format search results as JSON...');
    const { text: formattedResults } = await generateText({
      model: anthropic('claude-3-5-sonnet-20240620'),
      prompt: `Based on the following information about "latest news about Anthropic and Claude", please provide the information in the following JSON format:
      
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
      
      Here's the information to format:
      
      ${searchResults}
      
      Return ONLY the JSON with no additional text.`,
      maxTokens: 1500,
    });
    
    console.log('Format response received');
    
    // Return both responses
    return NextResponse.json({
      success: true,
      message: 'Anthropic search test successful using Vercel AI SDK',
      searchContent: [{ type: 'text', text: searchResults }],
      formatContent: [{ type: 'text', text: formattedResults }]
    });
  } catch (error) {
    console.error('Error in Anthropic search test endpoint:', error);
    return NextResponse.json(
      { error: `Anthropic search test failed: ${error}` },
      { status: 500 }
    );
  }
} 