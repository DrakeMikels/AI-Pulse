/**
 * Simple script to test the MCP integration with your API key
 * 
 * Usage: 
 * node scripts/test-mcp.mjs
 * 
 * This script will use the ANTHROPIC_API_KEY from your .env.local file
 */

// Load environment variables from .env.local
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Import Anthropic's Claude API client instead of MCP SDK
import { Anthropic } from '@anthropic-ai/sdk';

async function testMCP() {
  // Get API key from environment variable
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.error('Error: No API key found in .env.local');
    console.log('Please add your Anthropic API key to .env.local as ANTHROPIC_API_KEY');
    process.exit(1);
  }
  
  console.log(`Testing Claude API with key: ${apiKey.substring(0, 5)}...`);
  
  try {
    // Create Anthropic client with the provided API key
    const client = new Anthropic({
      apiKey
    });
    
    // Test web search using Claude's tool use
    console.log('\nTesting web search with Claude...');
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
    
    console.log('Search response:');
    console.log(JSON.stringify(searchResponse.content, null, 2));
    
    // Test content summarization
    console.log('\nTesting text generation...');
    const sampleContent = `
      Anthropic has released Claude 3, its most capable AI assistant family yet. 
      Claude 3 comes in three models: Haiku, Sonnet, and Opus, each optimized for different needs.
      Claude 3 Opus is our most powerful model, setting industry-leading benchmarks in graduate-level reasoning, coding, and knowledge.
      Claude 3 Sonnet balances intelligence and speed, outperforming many larger models.
      Claude 3 Haiku is our fastest and most compact model, designed for near-instant responsiveness.
    `;
    
    const summaryResponse = await client.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 150,
      messages: [
        {
          role: 'user',
          content: `Please summarize the following text in about 50 words:
          
          ${sampleContent}`
        }
      ]
    });
    
    console.log(`Summary: ${summaryResponse.content[0].text}`);
    
    console.log('\nAll tests completed successfully!');
    console.log('Your Claude API integration is working correctly.');
    console.log('\nNext steps:');
    console.log('1. Visit http://localhost:3001/api/mcp-test to test the full integration');
    console.log('2. Try running the MCP-enhanced scraper with: npm run dev -- --mcp');
    
  } catch (error) {
    console.error('Error testing Claude API:', error);
    console.log('\nTroubleshooting tips:');
    console.log('1. Check that your API key is correct');
    console.log('2. Ensure you have access to the Claude API');
    console.log('3. Check your network connection');
    process.exit(1);
  }
}

testMCP(); 