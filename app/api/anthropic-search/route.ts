import { NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';

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
    
    // Initialize the Anthropic client
    const client = new Anthropic({
      apiKey
    });
    console.log('Anthropic client initialized');
    
    // Test web search using Claude's tool use
    console.log('Starting web search...');
    const searchResponse = await client.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1000,
      system: "You are a helpful AI assistant that can search the web for information.",
      messages: [
        {
          role: 'user',
          content: 'Search the web for the latest news about Anthropic and Claude.'
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
    
    console.log('Search response received');
    console.log('Response content types:', searchResponse.content.map(item => item.type));
    
    // Now ask Claude to format the search results as JSON
    console.log('Asking Claude to format search results as JSON...');
    const formatResponse = await client.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: `Based on your web search for "latest news about Anthropic and Claude", please provide the search results in the following JSON format:
          
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
    
    console.log('Format response received');
    
    // Return both responses
    return NextResponse.json({
      success: true,
      message: 'Anthropic search test successful',
      searchContent: searchResponse.content,
      formatContent: formatResponse.content
    });
  } catch (error) {
    console.error('Error in Anthropic search test endpoint:', error);
    return NextResponse.json(
      { error: `Anthropic search test failed: ${error}` },
      { status: 500 }
    );
  }
} 