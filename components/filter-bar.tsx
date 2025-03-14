"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface FilterBarProps {
  filters: {
    source: string
    topic: string
    timeframe: string
  }
  onChange: (filters: { source: string; topic: string; timeframe: string }) => void
}

export function FilterBar({ filters, onChange }: FilterBarProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Select value={filters.source} onValueChange={(value) => onChange({ ...filters, source: value })}>
        <SelectTrigger className="w-full sm:w-[150px]">
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sources</SelectItem>
          <SelectItem value="openai">OpenAI</SelectItem>
          <SelectItem value="anthropic">Anthropic</SelectItem>
          <SelectItem value="deepmind">DeepMind</SelectItem>
          <SelectItem value="meta">Meta AI</SelectItem>
          <SelectItem value="huggingface">Hugging Face</SelectItem>
          <SelectItem value="aiblog">AI Blog</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filters.topic} onValueChange={(value) => onChange({ ...filters, topic: value })}>
        <SelectTrigger className="w-full sm:w-[150px]">
          <SelectValue placeholder="Topic" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Topics</SelectItem>
          <SelectItem value="llm">LLMs</SelectItem>
          <SelectItem value="vision">Computer Vision</SelectItem>
          <SelectItem value="research">Research</SelectItem>
          <SelectItem value="product">Product Updates</SelectItem>
          <SelectItem value="business">Business</SelectItem>
          <SelectItem value="safety">AI Safety</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filters.timeframe} onValueChange={(value) => onChange({ ...filters, timeframe: value })}>
        <SelectTrigger className="w-full sm:w-[150px]">
          <SelectValue placeholder="Timeframe" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="2days">Last 2 Days</SelectItem>
          <SelectItem value="week">This Week</SelectItem>
          <SelectItem value="month">This Month</SelectItem>
          <SelectItem value="all">All Time</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

