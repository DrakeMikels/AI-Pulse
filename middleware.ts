import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This middleware runs on every request
export async function middleware(request: NextRequest) {
  // Only run this logic in production and only once per deployment
  if (process.env.NODE_ENV === 'production') {
    try {
      // Call the revalidate API to refresh articles
      // We use a custom header to prevent infinite loops
      const hasRevalidated = request.headers.get('x-revalidated');
      
      if (!hasRevalidated && !request.nextUrl.pathname.startsWith('/api/')) {
        // Only do this for non-API routes to prevent infinite loops
        const revalidateUrl = new URL('/api/revalidate', request.url);
        
        // Make the request in the background
        fetch(revalidateUrl.toString(), {
          headers: {
            'x-revalidated': '1',
          },
        }).catch(err => {
          console.error('Error calling revalidate API:', err);
        });
      }
    } catch (error) {
      console.error('Error in middleware:', error);
    }
  }

  // Continue with the request
  return NextResponse.next();
}

// Configure which paths this middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - API routes that start with /api/ (to prevent infinite loops)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/|_next/static|_next/image|favicon.ico).*)',
  ],
}; 