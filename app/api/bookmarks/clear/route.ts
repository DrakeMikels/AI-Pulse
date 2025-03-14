import { NextResponse } from "next/server"
import { bookmarks } from "../bookmarks"

export async function POST() {
  try {
    bookmarks.clear();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error clearing bookmarks:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
} 