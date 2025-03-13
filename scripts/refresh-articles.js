const { exec } = require('child_process');
const path = require('path');

// Get the absolute path to the scraper script
const scraperPath = path.join(__dirname, 'scraper.py');

console.log('Executing scraper script:', scraperPath);

// Execute the scraper script with quotes around the path to handle spaces
exec(`python "${scraperPath}"`, (error, stdout, stderr) => {
  if (error) {
    console.error('Error running scraper:', error);
    process.exit(1);
  }
  
  if (stderr) {
    console.error('Scraper error:', stderr);
    process.exit(1);
  }
  
  console.log('Scraper output:', stdout);
  console.log('Articles refreshed successfully');
  process.exit(0);
}); 