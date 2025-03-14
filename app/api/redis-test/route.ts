import { NextResponse } from 'next/server';
import Redis from 'ioredis';

export async function GET() {
  try {
    // Initialize Redis client with the URL
    const redisUrl = process.env.REDIS_URL || "redis://default:7SXHj1HFOhuJz85v1xMTsdds0XpeIvKM@redis-15843.c90.us-east-1-3.ec2.redns.redis-cloud.com:15843";
    
    if (!redisUrl) {
      return NextResponse.json({ 
        success: false, 
        error: 'Redis URL not found in environment variables' 
      }, { status: 500 });
    }
    
    const redis = new Redis(redisUrl);
    
    // Test connection by setting and getting a value
    await redis.set('test-key', 'Redis connection successful');
    const result = await redis.get('test-key');
    
    // Close the connection
    await redis.quit();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Redis connection test successful',
      result,
      redisUrl: redisUrl.replace(/\/\/.*?:(.*)@/, '//***:***@') // Hide credentials in response
    });
  } catch (error) {
    console.error('Redis connection test failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: `Redis connection test failed: ${error instanceof Error ? error.message : String(error)}` 
    }, { status: 500 });
  }
} 