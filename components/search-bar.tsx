"use client"

import { useState, useEffect } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState(value)
  const router = useRouter()

  // Initialize search query from URL on mount
  useEffect(() => {
    // Get URL search params using window.location instead of useSearchParams
    const urlParams = new URLSearchParams(window.location.search);
    const queryParam = urlParams.get("q")
    if (queryParam) {
      setSearchQuery(queryParam)
      onChange(queryParam)
    }
  }, [onChange])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    onChange(searchQuery)
    
    // Update URL with search query
    const currentUrl = new URL(window.location.href);
    const params = new URLSearchParams(currentUrl.search);
    
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

