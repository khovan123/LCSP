/**
 * Architecture scope payload attached to multi-repo scan events.
 * This is an optional extension to the existing scan payload —
 * workers that don't recognise it must ignore it safely.
 */
export type ArchitectureScopePayload = {
  /** Cross-repo declaration describing how repositories interact. */
  globalDeclaration: string;
  /** Per-repo declarations providing repo-specific scanner context. */
  repos: {
    connectionId: string;
    repositoryFullName: string;
    /** Repo-specific technical declaration (empty string if none). */
    declaration: string;
  }[];
};
