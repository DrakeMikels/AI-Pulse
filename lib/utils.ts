import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export function timeAgo(date: string | Date): string {
  const now = new Date()
  const past = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds} second${diffInSeconds !== 1 ? 's' : ''} ago`
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`
  }
  
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`
  }
  
  const diffInMonths = Math.floor(diffInDays / 30)
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''} ago`
  }
  
  const diffInYears = Math.floor(diffInMonths / 12)
  return `${diffInYears} year${diffInYears !== 1 ? 's' : ''} ago`
}

/**
 * Clean up article content for display
 * @param content The raw article content
 * @returns Cleaned up content
 */
export function cleanArticleContent(content: string): string {
  if (!content) return '';
  
  // Replace common HTML entities
  let cleaned = content
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
  
  // Remove HTML tags but preserve paragraphs with line breaks
  cleaned = cleaned
    .replace(/<p[^>]*>(.*?)<\/p>/g, '$1\n\n') // Replace paragraphs with their content and add line breaks
    .replace(/<br\s*\/?>/g, '\n') // Replace <br> with line breaks
    .replace(/<\/?(div|span|h\d|ul|ol|li|strong|em|b|i|a)[^>]*>/g, '') // Remove common HTML tags
    .replace(/<[^>]*>/g, ''); // Remove any remaining HTML tags
  
  // Fix spacing issues
  cleaned = cleaned
    .replace(/\n{3,}/g, '\n\n') // Replace multiple line breaks with just two
    .replace(/\s{2,}/g, ' ') // Replace multiple spaces with a single space
    .trim();
  
  // Remove any URLs or strange formatting that might be left
  cleaned = cleaned
    .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
    .replace(/\[\d+\]/g, '') // Remove reference numbers like [1], [2], etc.
    .replace(/\(\s*source:.*?\)/gi, ''); // Remove source references
  
  // Handle special cases for RSS feeds
  if (cleaned.includes('content:encoded') || cleaned.includes('CDATA')) {
    // Use a workaround for the 's' flag (dotAll) for older JS versions
    cleaned = cleaned.replace(/\[\s*CDATA\s*\[([\s\S]*?)\]\s*\]/g, '$1');
    cleaned = cleaned.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  }
  
  return cleaned;
}
