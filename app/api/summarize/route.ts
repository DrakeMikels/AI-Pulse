import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Debug: Log available environment variables
    console.log("Env Variables:", Object.keys(process.env));
    
    // Get the article content from the request body
    const { content, title, url } = await request.json();
    
    if (!content) {
      return NextResponse.json(
        { error: 'Article content is required' },
        { status: 400 }
      );
    }

    // Check for Perplexity API key
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      console.error('PERPLEXITY_API_KEY is not set');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    // Log the API key format (first few characters)
    console.log('Using Perplexity API key starting with:', apiKey.substring(0, 5) + '...');
    console.log('API key length:', apiKey.length);

    // Create the prompt for Perplexity
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

    // Call Perplexity API
    console.log('Calling Perplexity API for article summarization...');
    
    const perplexityUrl = 'https://api.perplexity.ai/chat/completions';
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
    const body = {
      "model": "pplx-7b-online",
      "stream": false,
      "max_tokens": 1024,
      "frequency_penalty": 1,
      "temperature": 0.0,
      "messages": [
        {
          "role": "system",
          "content": "You are a helpful assistant that summarizes articles. Be precise and concise in your responses."
        },
        {
          "role": "user",
          "content": prompt
        }
      ]
    };

    const response = await fetch(perplexityUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', errorText);
      throw new Error(`Perplexity API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('Successfully generated summary with Perplexity');
    
    // Extract the summary from Perplexity's response
    const summary = data.choices[0].message.content;
    
    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Error summarizing article with Perplexity:', error);
    return NextResponse.json(
      { error: 'Failed to summarize article' },
      { status: 500 }
    );
  }
} 