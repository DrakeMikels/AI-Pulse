import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"
import path from "path"

const execPromise = promisify(exec)

export async function GET(request: Request) {
  try {
    // Get the absolute path to the scraper script
    const scraperPath = path.join(process.cwd(), "scripts", "scraper.py")
    
    // Execute the scraper script
    const { stdout, stderr } = await execPromise(`python ${scraperPath}`)
    
    if (stderr) {
      console.error("Scraper error:", stderr)
      return NextResponse.json({ success: false, error: stderr }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "Scraper executed successfully", 
      output: stdout 
    })
  } catch (error) {
    console.error("Error running scraper:", error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
}

// Helper function to get headers
function headers() {
  return {
    get: (name: string) => {
      // In a real environment, this would access the actual request headers
      return null
    },
  }
}

