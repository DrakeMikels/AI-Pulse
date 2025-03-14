import { NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';

export async function GET() {
  try {
    console.log('Anthropic test endpoint called');
    
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
    
    // Simple text generation test
    console.log('Starting text generation...');
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: 'What are the latest developments in AI? Please provide a brief summary.'
        }
      ]
    });
    
    console.log('Response received');
    
    // Return the response
    return NextResponse.json({
      success: true,
      message: 'Anthropic test successful',
      content: response.content
    });
  } catch (error) {
    console.error('Error in Anthropic test endpoint:', error);
    return NextResponse.json(
      { error: `Anthropic test failed: ${error}` },
      { status: 500 }
    );
  }
} 