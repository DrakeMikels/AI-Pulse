import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"
import path from "path"

const execPromise = promisify(exec)

export async function GET() {
  try {
    // Get the absolute path to the refresh script
    const refreshScriptPath = path.join(process.cwd(), "scripts", "refresh-articles.js")
    
    console.log("Executing refresh script:", refreshScriptPath)
    
    // Execute the refresh script
    const { stdout, stderr } = await execPromise(`node "${refreshScriptPath}"`)
    
    if (stderr && stderr.length > 0) {
      console.error("Refresh error:", stderr)
      return NextResponse.json({ success: false, error: stderr }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "Articles refreshed successfully", 
      output: stdout 
    })
  } catch (error) {
    console.error("Error refreshing articles:", error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
} 