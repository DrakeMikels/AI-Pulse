import { NextResponse } from 'next/server';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

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
    
    // Simple text generation test using Vercel AI SDK
    console.log('Starting text generation with Vercel AI SDK...');
    const { text } = await generateText({
      model: anthropic('claude-3-5-sonnet-20240620'),
      prompt: 'What are the latest developments in AI? Please provide a brief summary.',
      maxTokens: 300,
    });
    
    console.log('Response received');
    
    // Return the response
    return NextResponse.json({
      success: true,
      message: 'Anthropic test successful using Vercel AI SDK',
      content: [{ type: 'text', text }]
    });
  } catch (error) {
    console.error('Error in Anthropic test endpoint:', error);
    return NextResponse.json(
      { error: `Anthropic test failed: ${error}` },
      { status: 500 }
    );
  }
} 