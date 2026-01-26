/**
 * Request Loading Indicator Component
 *
 * Displays a simple progress indicator whenever any axios requests are in flight.
 * Uses the api-service's built-in request tracking.
 *
 * @component
 */

import { useEffect, useState } from "react"
import apiService from "@/service/api-service"

interface RequestLoadingIndicatorProps {
  /** Position of the indicator: "bar" (top bar), "inline" (with text), or "overlay" (full screen) */
  position?: "overlay" | "inline" | "bar"
}

export default function RequestLoadingIndicator({
  position = "bar",
}: RequestLoadingIndicatorProps) {
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Subscribe to loading state changes
    const unsubscribe = apiService.subscribeToLoadingState((loading) => {
      console.log("[RequestLoadingIndicator] Loading state:", loading) // Debug log
      setIsLoading(loading)
    })

    return unsubscribe
  }, [])

  if (!isLoading) return null

  // Top bar loader (minimal, non-intrusive)
  if (position === "bar") {
    return (
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 z-50 animate-pulse shadow-lg" />
    )
  }

  // Inline loader (for inline placement)
  if (position === "inline") {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent" />
          <span className="text-sm text-blue-700">Loading...</span>
        </div>
      </div>
    )
  }

  // Full overlay (centered modal)
  if (position === "overlay") {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
            <p className="text-gray-700 font-medium">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return null
}
