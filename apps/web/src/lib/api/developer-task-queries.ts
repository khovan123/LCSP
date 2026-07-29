"use client";

import { useQuery } from "@tanstack/react-query";

import { getDeveloperTaskContext } from "./developer-task-client";
import { apiQueryKeys } from "./query-keys";

export function useDeveloperTaskContextQuery() {
  return useQuery({
    queryKey: apiQueryKeys.workspace.developerTask(),
    queryFn: getDeveloperTaskContext,
  });
}
