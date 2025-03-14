import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get API key from environment variable
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY is not set');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    // Check API key format
    const isValidFormat = apiKey.startsWith('sk-ant-');
    const keyLength = apiKey.length;
    const firstFiveChars = apiKey.substring(0, 5);
    const lastFiveChars = apiKey.substring(keyLength - 5);
    const hasWhitespace = /\s/.test(apiKey);
    
    return NextResponse.json({
      success: true,
      message: 'API key check',
      details: {
        isValidFormat,
        keyLength,
        firstFiveChars,
        lastFiveChars,
        hasWhitespace
      }
    });
  } catch (error) {
    console.error('Error checking API key:', error);
    return NextResponse.json(
      { error: 'Failed to check API key' },
      { status: 500 }
    );
  }
} 