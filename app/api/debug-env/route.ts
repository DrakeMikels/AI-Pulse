import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get all environment variable names
    const envVars = Object.keys(process.env);
    
    // Check for specific environment variables
    const hasAnthropicApiKey = !!process.env.ANTHROPIC_API_KEY;
    const hasLowercaseAnthropicApiKey = !!process.env.anthropic_api_key;
    const hasPerplexityApiKey = !!process.env.PERPLEXITY_API_KEY;
    
    // Get first few characters of API keys if they exist
    let anthropicApiKeyPrefix = null;
    if (process.env.ANTHROPIC_API_KEY) {
      anthropicApiKeyPrefix = process.env.ANTHROPIC_API_KEY.substring(0, 5) + '...';
    }
    
    let lowercaseAnthropicApiKeyPrefix = null;
    if (process.env.anthropic_api_key) {
      lowercaseAnthropicApiKeyPrefix = process.env.anthropic_api_key.substring(0, 5) + '...';
    }
    
    let perplexityApiKeyPrefix = null;
    if (process.env.PERPLEXITY_API_KEY) {
      perplexityApiKeyPrefix = process.env.PERPLEXITY_API_KEY.substring(0, 5) + '...';
    }
    
    return NextResponse.json({
      success: true,
      envVarCount: envVars.length,
      envVars: envVars,
      hasAnthropicApiKey,
      hasLowercaseAnthropicApiKey,
      hasPerplexityApiKey,
      anthropicApiKeyPrefix,
      lowercaseAnthropicApiKeyPrefix,
      perplexityApiKeyPrefix
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to get environment variables' },
      { status: 500 }
    );
  }
} 