/**
 * Simple script to test the MCP integration with your API key
 * 
 * Usage: 
 * node scripts/test-mcp.js
 * 
 * This script will use the ANTHROPIC_API_KEY from your .env.local file
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

// Import the MCP SDK
const { MCPClient, WebSearchTool } = require('@modelcontextprotocol/sdk');

async function testMCP() {
  // Get API key from environment variable
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.error('Error: No API key found in .env.local');
    console.log('Please add your Anthropic API key to .env.local as ANTHROPIC_API_KEY');
    process.exit(1);
  }
  
  console.log(`Testing MCP with API key: ${apiKey.substring(0, 5)}...`);
  
  try {
    // Create MCP client with the provided API key
    const client = new MCPClient({
      apiKey,
      model: 'claude-3-sonnet-20240229'
    });
    
    // Initialize the web search tool
    const webSearchTool = new WebSearchTool();
    
    // Test web search
    console.log('\nTesting web search...');
    const results = await client.useTools([
      {
        tool: webSearchTool,
        input: { query: 'latest news from Anthropic about Claude' }
      }
    ]);
    
    const searchResults = results.toolResults[0]?.output?.results || [];
    console.log(`Found ${searchResults.length} search results`);
    
    if (searchResults.length > 0) {
      console.log('First result:');
      console.log(`- Title: ${searchResults[0].title}`);
      console.log(`- URL: ${searchResults[0].url}`);
      console.log(`- Snippet: ${searchResults[0].snippet.substring(0, 100)}...`);
    }
    
    // Test content summarization
    console.log('\nTesting text generation...');
    const sampleContent = `
      Anthropic has released Claude 3, its most capable AI assistant family yet. 
      Claude 3 comes in three models: Haiku, Sonnet, and Opus, each optimized for different needs.
      Claude 3 Opus is our most powerful model, setting industry-leading benchmarks in graduate-level reasoning, coding, and knowledge.
      Claude 3 Sonnet balances intelligence and speed, outperforming many larger models.
      Claude 3 Haiku is our fastest and most compact model, designed for near-instant responsiveness.
    `;
    
    const summaryResponse = await client.generateText({
      prompt: `Please summarize the following text in about 50 words:
      
      ${sampleContent}`
    });
    
    console.log(`Summary: ${summaryResponse.text}`);
    
    console.log('\nAll tests completed successfully!');
    console.log('Your MCP integration is working correctly.');
    console.log('\nNext steps:');
    console.log('1. Visit http://localhost:3001/api/mcp-test to test the full integration');
    console.log('2. Try running the MCP-enhanced scraper with: npm run dev -- --mcp');
    
  } catch (error) {
    console.error('Error testing MCP:', error);
    console.log('\nTroubleshooting tips:');
    console.log('1. Check that your API key is correct');
    console.log('2. Ensure you have access to the MCP API');
    console.log('3. Check your network connection');
    process.exit(1);
  }
}

testMCP(); 