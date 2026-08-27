// Reader for the v2 time-partitioned archive. Locates articles client-side with
// the shared shard selector (matches the Rust exporter). See
// company-feed-server/docs/design/2026-08-26-time-partitioned-archive.md.

import { DataRequestError, DEFAULT_DATA_BASE_URL, assertRelativeDataPath } from './client';
import { selector, type ShardScheme } from './selector';

export interface ArchiveConfigV2 {
  archive_version: string;
  generation: string;
  generated_at: string;
  record_count: number;
  company_count: number;
  articles_scheme: { current: string; v1: ShardScheme };
  companies_scheme: { current: string; v1: ShardScheme };
}

export interface ArticleV2 {
  schema: string;
  doc_id: string;
  company_key: string;
  company_name: string;
  category_key: string;
  category_name: string;
  source_kind: string;
  url: string;
  canonical_url: string;
  title: string;
  summary: string;
  body_markdown: string;
  published_at: string | null;
  first_seen_at: string;
  content_hash: string;
}

interface ArticleIndexRow {
  doc_id: string;
  date: string; // "YYYY/MM/DD"
  company_key: string;
}

// Lightweight row carried inline by the recent-day and company-month indexes, so
// list views render from one index fetch (no per-article data-file fetch). No
// body_markdown, no fetched_at (that is volatile -> meta/timestamps.jsonl).
export interface ArticleSummaryV2 {
  doc_id: string;
  company_key: string;
  company_name: string;
  source_kind: string;
  title: string;
  summary: string;
  published_at: string | null;
  first_seen_at: string;
}

interface CompanyIndexRow {
  company_key: string;
  company_name: string;
  article_count: number;
  months: string[]; // "YYYY-MM", newest first
}

export interface CategoryV2 {
  key: string;
  name: string;
  company_count: number;
  record_count: number;
}

export interface CategoryDirectoryV2 {
  taxonomy_generation: string;
  category_count: number;
  company_count: number;
  record_count: number;
  categories: CategoryV2[];
}

export interface CategoryCompanyV2 {
  company_key: string;
  company_name: string;
  record_count: number;
  last_published_at: string | null;
}

export interface CategoryDetailV2 {
  key: string;
  name: string;
  company_count: number;
  record_count: number;
  companies: CategoryCompanyV2[];
}

function normalizeBaseUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('The data base URL must use HTTP or HTTPS');
  }
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url;
}

function pad3(n: number): string {
  return n.toString().padStart(3, '0');
}

export class CompanyNewsDataClientV2 {
  readonly baseUrl: URL;
  private configCache?: ArchiveConfigV2;

  constructor(baseUrl = DEFAULT_DATA_BASE_URL) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
  }

  private urlFor(path: string, cacheKey?: string): URL {
    assertRelativeDataPath(path);
    const url = new URL(path, this.baseUrl);
    if (url.origin !== this.baseUrl.origin || !url.pathname.startsWith(this.baseUrl.pathname)) {
      throw new DataRequestError('Data path escaped its configured repository', path);
    }
    if (cacheKey) url.searchParams.set('generation', cacheKey);
    return url;
  }

  private async getJson<T>(path: string, cacheKey?: string, signal?: AbortSignal): Promise<T> {
    const res = await fetch(this.urlFor(path, cacheKey), {
      signal,
      cache: cacheKey ? 'force-cache' : 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      throw new DataRequestError(`Data request failed with HTTP ${res.status}`, path, res.status);
    }
    try {
      return (await res.json()) as T;
    } catch {
      throw new DataRequestError('Data response was not valid JSON', path);
    }
  }

  private async getJsonl<T>(path: string, cacheKey?: string, signal?: AbortSignal): Promise<T[]> {
    const res = await fetch(this.urlFor(path, cacheKey), {
      signal,
      cache: cacheKey ? 'force-cache' : 'no-store',
      headers: { Accept: 'application/x-ndjson, application/json;q=0.9' },
    });
    if (!res.ok) {
      throw new DataRequestError(`Index request failed with HTTP ${res.status}`, path, res.status);
    }
    const text = await res.text();
    return text
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as T);
  }

  async getConfig(signal?: AbortSignal): Promise<ArchiveConfigV2> {
    if (!this.configCache) {
      this.configCache = await this.getJson<ArchiveConfigV2>('v2/config.json', undefined, signal);
    }
    return this.configCache;
  }

  /** Newest-first list of day dirs ("YYYY/MM/DD") that have articles. */
  async getRecentDays(signal?: AbortSignal): Promise<string[]> {
    const cfg = await this.getConfig(signal);
    const doc = await this.getJson<{ days: string[] }>(
      'v2/index/recent/days.json',
      cfg.generation,
      signal,
    );
    return doc.days;
  }

  /** The article summaries published on a given day dir ("YYYY/MM/DD"). */
  async getDay(dayDir: string, signal?: AbortSignal): Promise<ArticleSummaryV2[]> {
    const cfg = await this.getConfig(signal);
    const doc = await this.getJson<{ date: string; articles: ArticleSummaryV2[] }>(
      `v2/index/recent/${dayDir}.json`,
      cfg.generation,
      signal,
    );
    return doc.articles;
  }

  /** Fetch an article by its date dir (cheap; no lookup). */
  getArticleAt(dayDir: string, docId: string, generation?: string, signal?: AbortSignal): Promise<ArticleV2> {
    return this.getJson<ArticleV2>(`v2/data/${dayDir}/${docId}.json`, generation, signal);
  }

  /** Permalink: find the article's day via the hash-sharded index, then fetch it. */
  async getArticle(docId: string, signal?: AbortSignal): Promise<ArticleV2> {
    const cfg = await this.getConfig(signal);
    const scheme = cfg.articles_scheme;
    const bucket = await selector(docId, scheme.v1.salt, scheme.v1.bucket_count);
    const rows = await this.getJsonl<ArticleIndexRow>(
      `v2/index/articles/${scheme.current}/${pad3(bucket)}.jsonl`,
      cfg.generation,
      signal,
    );
    const row = rows.find((r) => r.doc_id === docId);
    if (!row) {
      throw new DataRequestError('Article not found in its index bucket', docId);
    }
    return this.getArticleAt(row.date, docId, cfg.generation, signal);
  }

  /** A company's months (newest first) via the hash-sharded company index. */
  async getCompanyMonths(companyKey: string, signal?: AbortSignal): Promise<CompanyIndexRow | null> {
    const cfg = await this.getConfig(signal);
    const scheme = cfg.companies_scheme;
    const bucket = await selector(companyKey, scheme.v1.salt, scheme.v1.bucket_count);
    const rows = await this.getJsonl<CompanyIndexRow>(
      `v2/index/companies/_index/${scheme.current}/${pad3(bucket)}.jsonl`,
      cfg.generation,
      signal,
    );
    return rows.find((r) => r.company_key === companyKey) ?? null;
  }

  /** The category directory (all categories + aggregate counts). */
  async getCategoryDirectory(signal?: AbortSignal): Promise<CategoryDirectoryV2> {
    const cfg = await this.getConfig(signal);
    return this.getJson<CategoryDirectoryV2>('v2/taxonomy/directory.json', cfg.generation, signal);
  }

  /** One category's companies (with per-company count + last_published_at). */
  async getCategory(categoryKey: string, signal?: AbortSignal): Promise<CategoryDetailV2> {
    const cfg = await this.getConfig(signal);
    return this.getJson<CategoryDetailV2>(
      `v2/taxonomy/categories/${categoryKey}.json`,
      cfg.generation,
      signal,
    );
  }

  /** The article summaries for a company in a given month ("YYYY-MM"). */
  async getCompanyMonth(
    companyKey: string,
    month: string,
    signal?: AbortSignal,
  ): Promise<ArticleSummaryV2[]> {
    const cfg = await this.getConfig(signal);
    const doc = await this.getJson<{ articles: ArticleSummaryV2[] }>(
      `v2/index/companies/${companyKey}/${month}.json`,
      cfg.generation,
      signal,
    );
    return doc.articles;
  }
}

// Singleton reader for the v2 archive. Shares the same base URL env var as the v1
// client (`VITE_DATA_BASE_URL`) since v2 lives under `v2/` in the same repo, so
// no cutover of the base URL is needed to read v2 during the migration.
export const dataClientV2 = new CompanyNewsDataClientV2(
  import.meta.env.VITE_DATA_BASE_URL || DEFAULT_DATA_BASE_URL,
);
