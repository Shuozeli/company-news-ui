// Query hooks backed by the v2 time-partitioned reader (client_v2). These return
// the SAME shapes the existing pages consume (ArticleSummary, counts) so the page
// JSX is unchanged; only the data source moves from v1 manifests to v2 indexes.
//
// The v2 recent/company indexes are lean (doc_id lists only, per the design), so
// list views fetch each article's data file. For the recent feed we already know
// the day dir, so it is one fetch per article. For company articles we resolve the
// day via the permalink bucket (getArticle) -- chattier, noted as a future index
// enrichment. See docs/design/2026-08-26-time-partitioned-archive.md.

import {
  useInfiniteQuery,
  useQuery,
  type UseInfiniteQueryResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { summaryRowV2ToSummary } from '../data/adapt_v2';
import {
  dataClientV2,
  type ArchiveConfigV2,
  type ArticleV2,
  type CategoryDetailV2,
  type CategoryDirectoryV2,
} from '../data/client_v2';
import type { ArticleSummary } from '../data/types';

// One shared config query: carries the generation (used as the fetch cache key)
// plus record/company counts for the home snapshot.
export function useConfigV2(): UseQueryResult<ArchiveConfigV2> {
  return useQuery({
    queryKey: ['v2-config'],
    queryFn: ({ signal }) => dataClientV2.getConfig(signal),
    staleTime: 60_000,
    retry: 2,
  });
}

// Newest `limit` articles across the most recent day partitions. Each day file
// already carries summary rows, so this is one fetch per day (not per article).
export function useRecentArticlesV2(
  limit: number,
): UseQueryResult<ArticleSummary[]> {
  const configQuery = useConfigV2();
  const generation = configQuery.data?.generation;
  return useQuery({
    queryKey: ['v2-recent', generation, limit],
    enabled: Boolean(generation),
    staleTime: 60_000,
    queryFn: async ({ signal }): Promise<ArticleSummary[]> => {
      const days = await dataClientV2.getRecentDays(signal);
      const collected: ArticleSummary[] = [];
      for (const dayDir of days) {
        if (collected.length >= limit) break;
        const rows = await dataClientV2.getDay(dayDir, signal);
        collected.push(...sortByRecency(rows.map(summaryRowV2ToSummary)));
      }
      return collected.slice(0, limit);
    },
  });
}

// The recency feed paged by DAY: each infinite page is one recent day's articles
// (newest day first), rendered straight from the day file's summary rows.
export function useLatestArticlesV2(): UseInfiniteQueryResult<
  { pages: ArticleSummary[][] },
  Error
> {
  const configQuery = useConfigV2();
  const generation = configQuery.data?.generation;
  const daysQuery = useQuery({
    queryKey: ['v2-recent-days', generation],
    enabled: Boolean(generation),
    staleTime: 60_000,
    queryFn: ({ signal }) => dataClientV2.getRecentDays(signal),
  });
  const days = daysQuery.data;
  return useInfiniteQuery({
    queryKey: ['v2-latest', generation],
    enabled: Boolean(generation && days && days.length > 0),
    staleTime: Number.POSITIVE_INFINITY,
    initialPageParam: 0,
    queryFn: async ({ pageParam, signal }): Promise<ArticleSummary[]> => {
      if (!days) throw new Error('No recent days');
      const dayDir = days[pageParam];
      if (!dayDir) return [];
      const rows = await dataClientV2.getDay(dayDir, signal);
      return sortByRecency(rows.map(summaryRowV2ToSummary));
    },
    getNextPageParam: (_last, loaded) =>
      days && loaded.length < days.length ? loaded.length : undefined,
  });
}

// A single article by permalink (companyKey is only used for cache-key locality;
// the doc_id alone resolves the article via its hash bucket).
export function useArticleV2(
  documentId: string | undefined,
): UseQueryResult<ArticleV2> {
  const configQuery = useConfigV2();
  const generation = configQuery.data?.generation;
  return useQuery({
    queryKey: ['v2-article', generation, documentId],
    enabled: Boolean(generation && documentId),
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: ({ signal }) => {
      if (!documentId) throw new Error('No document id');
      return dataClientV2.getArticle(documentId, signal);
    },
  });
}

export interface CompanyIndexV2 {
  company_key: string;
  company_name: string;
  article_count: number;
  months: string[]; // "YYYY-MM", newest first
}

// A company's directory entry (name, count, month list) via the company bucket.
export function useCompanyIndexV2(
  companyKey: string | undefined,
): UseQueryResult<CompanyIndexV2 | null> {
  const configQuery = useConfigV2();
  const generation = configQuery.data?.generation;
  return useQuery({
    queryKey: ['v2-company-index', generation, companyKey],
    enabled: Boolean(generation && companyKey),
    staleTime: 60_000,
    queryFn: async ({ signal }): Promise<CompanyIndexV2 | null> => {
      if (!companyKey) throw new Error('No company key');
      const row = await dataClientV2.getCompanyMonths(companyKey, signal);
      return row as CompanyIndexV2 | null;
    },
  });
}

// A company's articles, paged by month (newest month first). Each infinite page
// is one month of that company's articles.
export function useCompanyArticlesV2(
  companyKey: string | undefined,
  months: string[] | undefined,
): UseInfiniteQueryResult<{ pages: ArticleSummary[][] }, Error> {
  const configQuery = useConfigV2();
  const generation = configQuery.data?.generation;
  return useInfiniteQuery({
    queryKey: ['v2-company-articles', generation, companyKey],
    enabled: Boolean(generation && companyKey && months && months.length > 0),
    staleTime: Number.POSITIVE_INFINITY,
    initialPageParam: 0,
    queryFn: async ({ pageParam, signal }): Promise<ArticleSummary[]> => {
      if (!companyKey || !months) throw new Error('No company selected');
      const month = months[pageParam];
      if (!month) return [];
      const rows = await dataClientV2.getCompanyMonth(companyKey, month, signal);
      return sortByRecency(rows.map(summaryRowV2ToSummary));
    },
    getNextPageParam: (_last, loaded) =>
      months && loaded.length < months.length ? loaded.length : undefined,
  });
}

// The category directory (all categories + aggregate counts).
export function useCategoryDirectoryV2(): UseQueryResult<CategoryDirectoryV2> {
  const configQuery = useConfigV2();
  const generation = configQuery.data?.generation;
  return useQuery({
    queryKey: ['v2-taxonomy-directory', generation],
    enabled: Boolean(generation),
    staleTime: 60_000,
    queryFn: ({ signal }) => dataClientV2.getCategoryDirectory(signal),
  });
}

// One category's full company list (single file, no pagination in v2).
export function useCategoryV2(
  categoryKey: string | undefined,
): UseQueryResult<CategoryDetailV2> {
  const configQuery = useConfigV2();
  const generation = configQuery.data?.generation;
  return useQuery({
    queryKey: ['v2-taxonomy-category', generation, categoryKey],
    enabled: Boolean(generation && categoryKey),
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: ({ signal }) => {
      if (!categoryKey) throw new Error('No category key');
      return dataClientV2.getCategory(categoryKey, signal);
    },
  });
}

function sortByRecency(items: ArticleSummary[]): ArticleSummary[] {
  return [...items].sort((a, b) => {
    const ta = a.published_at ?? a.fetched_at;
    const tb = b.published_at ?? b.fetched_at;
    return tb.localeCompare(ta);
  });
}
