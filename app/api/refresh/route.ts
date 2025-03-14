import { NextResponse } from 'next/server';
import { refreshArticles } from '@/lib/scraper';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Check for CRON_SECRET if provided in the request
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Refresh articles using the improved function
    const result = await refreshArticles();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Successfully refreshed and saved ${result.count} articles`
      });
    } else {
      return NextResponse.json({
        success: false,
        message: `Failed to refresh articles: ${result.error}`,
        count: result.count
      });
    }
  } catch (error) {
    console.error('Error in refresh API route:', error);
    return NextResponse.json(
      { success: false, message: `Error refreshing articles: ${error}` },
      { status: 500 }
    );
  }
} 