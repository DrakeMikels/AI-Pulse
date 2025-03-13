const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get the absolute path to the scraper script
const scraperPath = path.join(__dirname, 'scraper.py');

console.log('Executing scraper script:', scraperPath);

// Function to generate sample articles when Python is not available
function generateSampleArticles() {
  const sources = ["Anthropic", "OpenAI", "Google AI", "DeepMind", "Meta AI"];
  const topics = ["LLM", "Computer Vision", "AI Safety", "Multimodal AI", "Research"];
  
  return Array.from({ length: 10 }, (_, i) => ({
    id: `sample-${i}-${Date.now()}`,
    title: `Sample Article ${i + 1}`,
    summary: `This is a sample article summary for article ${i + 1}.`,
    content: `This is the content of sample article ${i + 1}. It contains information about AI advancements.`,
    url: `https://example.com/article-${i + 1}`,
    imageUrl: `https://placehold.co/600x400?text=AI+Article+${i + 1}`,
    source: sources[i % sources.length],
    topics: [topics[i % topics.length], topics[(i + 1) % topics.length]],
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  }));
}

// Function to create fallback data when Python is not available
function createFallbackData() {
  console.log('Python not available, using fallback mechanism');
  
  // Path to the data directory and articles.json file
  const dataDir = path.join(process.cwd(), 'data');
  const articlesPath = path.join(dataDir, 'articles.json');
  
  // Create data directory if it doesn't exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Generate sample articles
  const sampleArticles = generateSampleArticles();
  
  // Write sample articles to file
  fs.writeFileSync(articlesPath, JSON.stringify(sampleArticles, null, 2));
  
  console.log('Generated sample articles as fallback');
  return true;
}

// Execute the scraper script with quotes around the path to handle spaces
exec(`python "${scraperPath}"`, (error, stdout, stderr) => {
  if (error) {
    console.error('Error running scraper:', error);
    
    // If Python is not available, use fallback mechanism
    if (error.code === 127 || error.message.includes("not recognized") || error.message.includes("No such file")) {
      if (createFallbackData()) {
        console.log('Articles refreshed using fallback mechanism');
        process.exit(0);
      }
    }
    
    process.exit(1);
  }
  
  if (stderr) {
    console.error('Scraper error:', stderr);
    
    // Try fallback if stderr indicates Python issues
    if (stderr.includes("python: can't open file") || stderr.includes("not recognized")) {
      if (createFallbackData()) {
        console.log('Articles refreshed using fallback mechanism');
        process.exit(0);
      }
    }
    
    process.exit(1);
  }
  
  console.log('Scraper output:', stdout);
  console.log('Articles refreshed successfully');
  process.exit(0);
}); 