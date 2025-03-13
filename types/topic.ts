export interface Topic {
  id: string
  name: string
  count: number
  trend: "up" | "down" | "stable"
  percentage: number
}

