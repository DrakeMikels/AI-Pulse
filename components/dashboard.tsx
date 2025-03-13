"use client"

import React, { useState, ReactNode } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { ArticleGrid } from "@/components/article-grid"
import { SearchBar } from "@/components/search-bar"
import { FilterBar } from "@/components/filter-bar"
import { TrendingTopics } from "@/components/trending-topics"
import { SidebarProvider } from "@/components/ui/sidebar"

interface DashboardProps {
  children?: ReactNode
}

export function Dashboard({ children }: DashboardProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState({
    source: "all",
    topic: "all",
    timeframe: "today",
  })

  return (
    <SidebarProvider>
      <div className="flex min-h-screen flex-col">
        <DashboardHeader />
        <div className="flex flex-1">
          <DashboardSidebar />
          <main className="flex-1 p-6">
            {children ? (
              children
            ) : (
              <>
                <div className="mb-6 flex flex-col gap-4">
                  <h1 className="text-3xl font-bold">AI Industry Updates</h1>
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <SearchBar value={searchQuery} onChange={setSearchQuery} />
                    <FilterBar filters={filters} onChange={setFilters} />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                  <div className="lg:col-span-3">
                    <ArticleGrid searchQuery={searchQuery} filters={filters} />
                  </div>
                  <div className="lg:col-span-1">
                    <TrendingTopics />
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}

