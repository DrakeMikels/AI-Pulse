// This script is used to manually trigger the article scraping process
// It calls the API endpoint that runs the scraper

const https = require('https');
const http = require('http');

// Get the base URL from environment or use localhost for development
const baseUrl = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : 'http://localhost:3000';

console.log(`Using base URL: ${baseUrl}`);

// Function to make HTTP request
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data });
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.end();
  });
}

async function refreshArticles() {
  try {
    console.log('Refreshing articles...');
    
    // Call the API endpoint that runs the scraper
    const response = await makeRequest(`${baseUrl}/api/cron/scrape`);
    
    if (response.statusCode === 200 && response.data.success) {
      console.log('Success:', response.data.message);
    } else {
      console.error('Error:', response.data.error || 'Unknown error');
    }
  } catch (error) {
    console.error('Failed to refresh articles:', error.message);
  }
}

// Run the function
refreshArticles(); 