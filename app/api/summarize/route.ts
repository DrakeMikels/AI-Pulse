import { NextResponse } from 'next/server';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

export async function POST(request: Request) {
  try {
    // Get the article content from the request body
    const { content, title, url } = await request.json();
    
    if (!content) {
      return NextResponse.json(
        { error: 'Article content is required' },
        { status: 400 }
      );
    }

    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY is not set');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    // Log the API key format (first few characters)
    console.log('Using API key starting with:', apiKey.substring(0, 5) + '...');
    console.log('API key length:', apiKey.length);

    // Create the prompt for Claude
    const prompt = `
    I need a concise summary of the following article titled "${title}".
    
    Article URL: ${url}
    
    Article content:
    ${content}
    
    Please provide a well-structured summary with the following sections:
    
    1. **Summary**: A 2-3 sentence overview of the key points
    2. **Main Takeaways**:
       * 3-5 bullet points highlighting the most important information
    3. **Key Details**: Any important technical details, announcements, or data points
    
    Format your response using markdown with clear headings and bullet points. Keep the summary concise and focused on the most important information.
    `;

    // Call Claude API using Vercel AI SDK with default provider
    console.log('Calling Claude API for article summarization via Vercel AI SDK...');
    
    const { text } = await generateText({
      model: anthropic('claude-3-5-sonnet-20240620'),
      prompt: prompt,
      maxTokens: 1000,
    });

    console.log('Successfully generated summary with Claude via Vercel AI SDK');
    
    return NextResponse.json({ summary: text });
  } catch (error) {
    console.error('Error summarizing article with Claude:', error);
    return NextResponse.json(
      { error: 'Failed to summarize article' },
      { status: 500 }
    );
  }
} 