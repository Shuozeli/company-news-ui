// Adapt a v2 article record to the ArticleSummary shape the existing card / row
// components consume, so wiring pages to the v2 reader does not require touching
// their JSX. document_id == doc_id (the identity contract is unchanged across the
// migration), so permalinks stay stable.
//
// Two fields have no direct v2 source and are filled deliberately:
//   - source_id: v2 data files carry no source_id (only source_kind); the UI never
//     renders it, so it is left empty.
//   - fetched_at: the per-crawl fetched_at lives in v2 meta/timestamps.jsonl, not
//     in the immutable article file. List/detail views only fall back to it when
//     published_at is null, so first_seen_at (a stable, always-present timestamp)
//     is the correct stand-in.

import type { ArticleSummaryV2, ArticleV2 } from './client_v2';
import type { ArticleSummary } from './types';

export function articleV2ToSummary(a: ArticleV2): ArticleSummary {
  return {
    schema_version: a.schema,
    document_id: a.doc_id,
    company_key: a.company_key,
    company_name: a.company_name,
    source_id: '',
    source_kind: a.source_kind as ArticleSummary['source_kind'],
    canonical_url: a.canonical_url,
    title: a.title,
    summary: a.summary,
    published_at: a.published_at,
    fetched_at: a.first_seen_at,
    article_path: `v2/data/${a.doc_id}`,
    record_path: `v2/data/${a.doc_id}`,
  };
}

// The recent/company indexes carry ArticleSummaryV2 rows (no canonical_url, since
// list cards don't need it -- only the detail page fetches the full article).
export function summaryRowV2ToSummary(a: ArticleSummaryV2): ArticleSummary {
  return {
    schema_version: 'article/v2',
    document_id: a.doc_id,
    company_key: a.company_key,
    company_name: a.company_name,
    source_id: '',
    source_kind: a.source_kind as ArticleSummary['source_kind'],
    canonical_url: '',
    title: a.title,
    summary: a.summary,
    published_at: a.published_at,
    fetched_at: a.first_seen_at,
    article_path: `v2/data/${a.doc_id}`,
    record_path: `v2/data/${a.doc_id}`,
  };
}
