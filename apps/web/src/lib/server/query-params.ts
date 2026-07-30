export type PaginationQueryOptions = {
  defaultPage?: number;
  defaultPageSize?: number;
  maxPageSize?: number;
  extra?: Record<string, string>;
};

export function buildPaginationQuery(
  url: URL,
  options: PaginationQueryOptions = {},
): URLSearchParams {
  const page = readPositiveInt(
    url.searchParams.get("page"),
    options.defaultPage ?? 1,
  );
  const pageSize = Math.min(
    readPositiveInt(
      url.searchParams.get("page_size"),
      options.defaultPageSize ?? 20,
    ),
    options.maxPageSize ?? 100,
  );

  return new URLSearchParams({
    ...(options.extra ?? {}),
    page: String(page),
    page_size: String(pageSize),
  });
}

function readPositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
