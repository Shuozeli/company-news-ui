import type {
  ArticleDocument,
  ArticleRecord,
  BrowsePage,
  CategoryDirectoryPage,
  CategoryDirectoryManifest,
  CompanyDirectoryBucket,
  CompanyDirectoryManifest,
  CompanyManifest,
  DataIndex,
  RecentManifest,
} from './types';

export const DEFAULT_DATA_BASE_URL =
  'https://raw.githubusercontent.com/datayuacx26/company-news-data/main/';

export class DataRequestError extends Error {
  readonly path: string;
  readonly status?: number;

  constructor(message: string, path: string, status?: number) {
    super(message);
    this.name = 'DataRequestError';
    this.path = path;
    this.status = status;
  }
}

function normalizeBaseUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('The data base URL must use HTTP or HTTPS');
  }
  if (!url.pathname.endsWith('/')) {
    url.pathname += '/';
  }
  return url;
}

export function assertRelativeDataPath(path: string): void {
  if (
    path.length === 0 ||
    path.startsWith('/') ||
    path.includes('\\') ||
    path.includes('?') ||
    path.includes('#') ||
    /^[a-z][a-z\d+.-]*:/i.test(path)
  ) {
    throw new DataRequestError('Unsafe data path', path);
  }

  const segments = path.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    throw new DataRequestError('Unsafe data path', path);
  }
}

function assertGeneration(
  actual: string,
  expected: string,
  path: string,
): void {
  if (actual !== expected) {
    throw new DataRequestError(
      'The dataset changed while this page was loading. Refresh to use the newest snapshot.',
      path,
    );
  }
}

export class CompanyNewsDataClient {
  readonly baseUrl: URL;

  constructor(baseUrl = DEFAULT_DATA_BASE_URL) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
  }

  private urlFor(
    path: string,
    cacheKey?: string,
    cacheKeyName = 'generation',
    additionalCacheKeys?: Readonly<Record<string, string>>,
  ): URL {
    assertRelativeDataPath(path);
    const url = new URL(path, this.baseUrl);
    if (
      url.origin !== this.baseUrl.origin ||
      !url.pathname.startsWith(this.baseUrl.pathname)
    ) {
      throw new DataRequestError('Data path escaped its configured repository', path);
    }
    if (cacheKey) {
      url.searchParams.set(cacheKeyName, cacheKey);
    }
    for (const [name, value] of Object.entries(additionalCacheKeys ?? {})) {
      url.searchParams.set(name, value);
    }
    return url;
  }

  private async getJson<T>(
    path: string,
    signal?: AbortSignal,
    cacheKey?: string,
    cacheKeyName?: string,
    additionalCacheKeys?: Readonly<Record<string, string>>,
  ): Promise<T> {
    const response = await fetch(
      this.urlFor(path, cacheKey, cacheKeyName, additionalCacheKeys),
      {
        signal,
        cache: cacheKey ? 'force-cache' : 'no-store',
        headers: { Accept: 'application/json' },
      },
    );
    if (!response.ok) {
      throw new DataRequestError(
        `Data request failed with HTTP ${response.status}`,
        path,
        response.status,
      );
    }
    try {
      return (await response.json()) as T;
    } catch {
      throw new DataRequestError('Data response was not valid JSON', path);
    }
  }

  private async getText(
    path: string,
    signal?: AbortSignal,
    generation?: string,
  ): Promise<string> {
    const response = await fetch(this.urlFor(path, generation), {
      signal,
      cache: generation ? 'force-cache' : 'no-store',
      headers: { Accept: 'text/markdown, text/plain;q=0.9' },
    });
    if (!response.ok) {
      throw new DataRequestError(
        `Article request failed with HTTP ${response.status}`,
        path,
        response.status,
      );
    }
    return response.text();
  }

  getIndex(signal?: AbortSignal): Promise<DataIndex> {
    return this.getJson<DataIndex>('index.json', signal);
  }

  async getRecentManifest(
    path: string,
    generation: string,
    signal?: AbortSignal,
  ): Promise<RecentManifest> {
    const manifest = await this.getJson<RecentManifest>(
      path,
      signal,
      generation,
    );
    assertGeneration(manifest.generation, generation, path);
    return manifest;
  }

  async getBrowsePage(
    path: string,
    generation: string,
    signal?: AbortSignal,
  ): Promise<BrowsePage> {
    const page = await this.getJson<BrowsePage>(path, signal, generation);
    assertGeneration(page.generation, generation, path);
    return page;
  }

  async getCompanyDirectory(
    path: string,
    generation: string,
    signal?: AbortSignal,
  ): Promise<CompanyDirectoryManifest> {
    const manifest = await this.getJson<CompanyDirectoryManifest>(
      path,
      signal,
      generation,
    );
    assertGeneration(manifest.generation, generation, path);
    return manifest;
  }

  async getCompanyBucket(
    path: string,
    generation: string,
    signal?: AbortSignal,
  ): Promise<CompanyDirectoryBucket> {
    const bucket = await this.getJson<CompanyDirectoryBucket>(
      path,
      signal,
      generation,
    );
    assertGeneration(bucket.generation, generation, path);
    return bucket;
  }

  async getCategoryDirectory(
    path: string,
    generation: string,
    taxonomyGeneration: string,
    signal?: AbortSignal,
  ): Promise<CategoryDirectoryManifest> {
    const manifest = await this.getJson<CategoryDirectoryManifest>(
      path,
      signal,
      generation,
      'generation',
      { taxonomy_generation: taxonomyGeneration },
    );
    assertGeneration(manifest.generation, generation, path);
    if (manifest.taxonomy_generation !== taxonomyGeneration) {
      throw new DataRequestError(
        'The company taxonomy changed while its directory was loading. Refresh to use the newest tree.',
        path,
      );
    }
    return manifest;
  }

  async getCategoryPage(
    path: string,
    generation: string,
    taxonomyGeneration: string,
    signal?: AbortSignal,
  ): Promise<CategoryDirectoryPage> {
    const page = await this.getJson<CategoryDirectoryPage>(
      path,
      signal,
      generation,
      'generation',
      { taxonomy_generation: taxonomyGeneration },
    );
    assertGeneration(page.generation, generation, path);
    if (page.taxonomy_generation !== taxonomyGeneration) {
      throw new DataRequestError(
        'The company taxonomy changed while this category was loading. Refresh to use the newest tree.',
        path,
      );
    }
    return page;
  }

  async getCompanyManifest(
    path: string,
    generation: string,
    signal?: AbortSignal,
  ): Promise<CompanyManifest> {
    const manifest = await this.getJson<CompanyManifest>(
      path,
      signal,
      generation,
    );
    if (manifest.article_index) {
      assertGeneration(manifest.article_index.generation, generation, path);
    }
    return manifest;
  }

  async getArticle(
    recordPath: string,
    articlePath: string,
    generation: string,
    signal?: AbortSignal,
  ): Promise<ArticleDocument> {
    const [record, markdown] = await Promise.all([
      this.getJson<ArticleRecord>(recordPath, signal, generation),
      this.getText(articlePath, signal, generation),
    ]);
    return { record, markdown };
  }
}

export function stripArchiveFrontmatter(markdown: string): string {
  const withoutFrontmatter = markdown.replace(
    /^---\r?\n[\s\S]*?\r?\n---\r?\n+/,
    '',
  );
  return withoutFrontmatter.replace(/^# .+\r?\n+/, '').trim();
}

export const dataClient = new CompanyNewsDataClient(
  import.meta.env.VITE_DATA_BASE_URL || DEFAULT_DATA_BASE_URL,
);
