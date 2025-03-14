import { NextResponse } from 'next/server';
import { fetchArticlesWithBrave } from '@/lib/brave-scraper';

export async function GET() {
  try {
    console.log('Starting Brave Search scraper...');
    
    // Check if BRAVE_API_KEY is set
    const braveApiKey = process.env.BRAVE_API_KEY;
    
    if (!braveApiKey) {
      return NextResponse.json({
        success: false,
        message: 'BRAVE_API_KEY not set'
      }, { status: 400 });
    }
    
    console.log(`Using Brave API key: ${braveApiKey.substring(0, 5)}...`);
    
    // Fetch articles using Brave Search
    const articles = await fetchArticlesWithBrave(2); // 2 articles per source for testing
    
    console.log(`Successfully fetched ${articles.length} articles with Brave Search`);
    
    // Return the articles
    return NextResponse.json({
      success: true,
      message: 'Brave Search scraper completed successfully',
      count: articles.length,
      articles
    });
  } catch (error) {
    console.error('Error in Brave Search scraper endpoint:', error);
    return NextResponse.json({
      success: false,
      message: `Error scraping with Brave Search: ${error}`
    }, { status: 500 });
  }
} 