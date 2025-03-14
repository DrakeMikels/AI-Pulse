import { NextResponse } from "next/server"
import { bookmarks } from "../bookmarks"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const id = params.id
  bookmarks.add(id)
  return NextResponse.json({ success: true, id })
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const id = params.id
  bookmarks.delete(id)
  return NextResponse.json({ success: true, id })
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const id = params.id
  const isBookmarked = bookmarks.has(id)
  return NextResponse.json({ isBookmarked })
}

