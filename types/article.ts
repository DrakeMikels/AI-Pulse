export interface Article {
  id: string
  title: string
  summary: string
  content: string
  url: string
  imageUrl: string | null
  source: string
  topics: string[]
  publishedAt: string
  createdAt: string
  bookmarked: boolean
}

