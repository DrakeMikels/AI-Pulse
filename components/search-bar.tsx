"use client"

import { useState, useEffect } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useRouter, useSearchParams } from "next/navigation"

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState(value)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Initialize search query from URL on mount
  useEffect(() => {
    const queryParam = searchParams.get("q")
    if (queryParam) {
      setSearchQuery(queryParam)
      onChange(queryParam)
    }
  }, [searchParams, onChange])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    onChange(searchQuery)
    
    // Update URL with search query
    const params = new URLSearchParams(searchParams.toString())
    if (searchQuery) {
      params.set("q", searchQuery)
    } else {
      params.delete("q")
    }
    
    router.push(`/?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSearch} className="relative w-full max-w-md">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search articles..."
        className="w-full pl-8 pr-12"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <Button 
        type="submit" 
        size="sm" 
        className="absolute right-1 top-1 h-7"
      >
        Search
      </Button>
    </form>
  )
}

