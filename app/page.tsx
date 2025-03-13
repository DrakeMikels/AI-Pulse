import { Suspense } from "react"
import { Dashboard } from "@/components/dashboard"

export default function Home() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <Dashboard />
    </Suspense>
  )
}

