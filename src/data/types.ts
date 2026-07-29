export interface DataIndex {
  contract_version: '1.0.0' | '1.1.0';
  dataset: 'company-news-data';
  schema_version: string;
  generation: string;
  taxonomy_generation?: string;
  generated_at: string;
  record_count: number;
  company_count: number;
  paths: {
    head: string;
    archive_manifest: string;
    recent_manifest: string;
    company_directory_manifest: string;
    category_directory_manifest?: string;
    openapi: string;
    content_rights: string;
  };
}

export interface PageDescriptor {
  page: number;
  path: string;
  record_count: number;
  byte_count: number;
  sha256: string;
  newest_at: string;
  oldest_at: string;
}

export interface RecentManifest {
  schema_version: string;
  generation: string;
  sort: 'published_at_desc_fetched_at_desc';
  page_size: 50;
  record_count: number;
  page_count: number;
  pages: PageDescriptor[];
}

export interface ArticleSummary {
  schema_version: string;
  document_id: string;
  company_key: string;
  company_name: string;
  source_id: string;
  source_kind: 'rss' | 'atom' | 'html' | 'browser';
  canonical_url: string;
  title: string;
  summary: string;
  published_at: string | null;
  fetched_at: string;
  article_path: string;
  record_path: string;
}

export interface BrowsePage {
  schema_version: string;
  generation: string;
  page: number;
  record_count: number;
  items: ArticleSummary[];
}

export interface CompanyDirectoryBucketDescriptor {
  bucket: string;
  path: string;
  company_count: number;
  byte_count: number;
  sha256: string;
}

export interface CompanyDirectoryManifest {
  schema_version: string;
  generation: string;
  company_count: number;
  bucket_count: number;
  buckets: CompanyDirectoryBucketDescriptor[];
}

export interface CompanyDirectoryEntry {
  company_key: string;
  company_name: string;
  record_count: number;
  first_published_at: string | null;
  last_published_at: string | null;
  company_manifest_path: string;
}

export interface CompanyDirectoryBucket {
  schema_version: string;
  generation: string;
  bucket: string;
  company_count: number;
  companies: CompanyDirectoryEntry[];
}

export interface CategoryDescriptor {
  key: string;
  name: string;
  company_count: number;
  record_count: number;
  page_count: number;
  pages: CategoryPageDescriptor[];
}

export interface CategoryPageDescriptor {
  page: number;
  path: string;
  company_count: number;
  record_count: number;
  byte_count: number;
  sha256: string;
}

export interface CategoryDirectoryManifest {
  schema_version: string;
  generation: string;
  taxonomy_generation: string;
  company_count: number;
  record_count: number;
  category_count: number;
  page_size: 100;
  categories: CategoryDescriptor[];
}

export interface CategoryDirectoryPage {
  schema_version: string;
  generation: string;
  taxonomy_generation: string;
  key: string;
  name: string;
  page: number;
  company_count: number;
  record_count: number;
  companies: CompanyDirectoryEntry[];
}

export interface CompanyManifest {
  schema_version: string;
  company: {
    key: string;
    name: string;
  };
  record_count: number;
  first_published_at: string | null;
  last_published_at: string | null;
  partitions: Array<{
    partition: string;
    record_count: number;
  }>;
  article_index?: {
    generation: string;
    sort: 'published_at_desc_fetched_at_desc';
    page_size: 50;
    page_count: number;
    pages: PageDescriptor[];
  };
}

export interface ArticleRecord {
  schema_version: string;
  document_id: string;
  company: {
    key: string;
    name: string;
  };
  source: {
    id: string;
    kind: 'rss' | 'atom' | 'html' | 'browser';
  };
  urls: {
    observed: string;
    canonical: string;
  };
  title: string;
  summary: string;
  published_at: string | null;
  first_seen_at: string;
  fetched_at: string;
  last_updated_at: string;
  paths: {
    article: string;
    record: string;
  };
  content: {
    media_type: 'text/markdown; charset=utf-8';
    bytes: number;
    sha256: string;
    normalized_content_hash: string;
  };
  provenance: {
    source_item_id: string;
    external_id: string;
  };
}

export interface ArticleDocument {
  record: ArticleRecord;
  markdown: string;
}
