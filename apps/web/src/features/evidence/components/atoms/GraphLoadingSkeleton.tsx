/**
 * Graph Loading Skeleton
 *
 * Placeholder component shown while evidence graph data is loading.
 */

"use client";

export interface GraphLoadingSkeletonProps {
  className?: string;
}

/**
 * Skeleton loader for graph visualization.
 * Shows animated placeholder while data loads.
 */
export function GraphLoadingSkeleton({
  className = "",
}: GraphLoadingSkeletonProps) {
  return (
    <div className={`w-full h-full bg-gray-50 rounded-lg p-4 ${className}`}>
      {/* Top controls skeleton */}
      <div className="flex gap-3 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-10 w-24 bg-gray-300 rounded animate-pulse"
          />
        ))}
      </div>

      {/* Main graph area skeleton */}
      <div className="flex gap-4">
        {/* Left sidebar */}
        <div className="w-64 bg-white rounded-lg p-3 border border-gray-200">
          <div className="h-6 bg-gray-300 rounded mb-3 w-32 animate-pulse" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 bg-gray-300 rounded animate-pulse" />
            ))}
          </div>
        </div>

        {/* Main canvas area */}
        <div className="flex-1 bg-white rounded-lg border border-gray-200 min-h-96">
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-300 rounded-full mx-auto mb-4 animate-pulse" />
              <div className="h-4 bg-gray-300 rounded w-48 mx-auto animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
