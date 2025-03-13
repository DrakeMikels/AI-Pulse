import { exec } from "child_process"
import cron from "node-cron"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, "..", "data")

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

// Function to run the Python scraper
function runScraper() {
  console.log("Starting scraper...")

  exec("python scripts/scraper.py", (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`)
      return
    }

    if (stderr) {
      console.error(`Stderr: ${stderr}`)
      return
    }

    console.log(`Scraper output: ${stdout}`)
  })
}

// Schedule the scraper to run every 6 hours
// '0 */6 * * *' = At minute 0 past every 6th hour
cron.schedule("0 */6 * * *", () => {
  console.log("Running scheduled scraper job")
  runScraper()
})

console.log("Scraper scheduler started. Will run every 6 hours.")
console.log("Running initial scrape...")

// Run immediately on startup
runScraper()

