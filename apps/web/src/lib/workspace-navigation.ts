import type { WorkspaceNavigationTarget } from "@/features/workspace/types/navigation.types";

export function parseWorkspaceNavigationTarget(
  href: string,
): WorkspaceNavigationTarget {
  const [pathname = "", hash = ""] = href.split("#", 2);

  return {
    pathname,
    hash: hash ? `#${hash}` : "",
  };
}

export function isWorkspaceNavigationItemActive({
  currentPathname,
  currentHash,
  href,
}: {
  currentPathname: string;
  currentHash: string;
  href: string;
}) {
  const target = parseWorkspaceNavigationTarget(href);

  return (
    currentPathname === target.pathname &&
    normalizeHash(currentHash) === target.hash
  );
}

export function getWorkspaceNavigationUrl(href: string) {
  const target = parseWorkspaceNavigationTarget(href);

  return `${target.pathname}${target.hash}`;
}

function normalizeHash(hash: string) {
  return hash.startsWith("#") ? hash : hash ? `#${hash}` : "";
}
