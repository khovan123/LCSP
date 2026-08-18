/**
 * Graph Error Display
 *
 * Component to display error states when graph data fails to load.
 */

"use client";

export interface GraphErrorDisplayProps {
  error?: Error | null;
  errorCode?: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * Get user-friendly error message based on error code or message.
 */
function getErrorMessage(error: Error | undefined, errorCode?: string): string {
  if (errorCode) {
    switch (errorCode) {
      case "EVIDENCE_NOT_FOUND":
        return "Evidence report not found. Please ensure the assessment has submitted evidence.";
      case "PBAC_DENIED":
        return "You do not have permission to view this evidence graph.";
      case "INVALID_CLUSTER_ID":
        return "The requested cluster was not found in the graph.";
      case "INVALID_ARGUMENT":
        return "Invalid request parameters. Please check your inputs.";
      default:
        return "An error occurred while loading the graph.";
    }
  }

  if (error?.message) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

/**
 * Component to display graph loading errors.
 */
export function GraphErrorDisplay({
  error,
  errorCode,
  onRetry,
  className = "",
}: GraphErrorDisplayProps) {
  const errorMessage = getErrorMessage(error, errorCode);

  return (
    <div
      className={`w-full bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}
    >
      <div className="flex items-start gap-4">
        <div className="text-red-600 text-2xl">⚠️</div>
        <div className="flex-1">
          <h3 className="font-semibold text-red-900 mb-2">
            Failed to Load Graph
          </h3>
          <p className="text-red-800 text-sm mb-4">{errorMessage}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
            >
              ↻ Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
