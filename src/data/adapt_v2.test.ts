import { describe, expect, it } from 'vitest';

import { articleV2ToSummary } from './adapt_v2';
import type { ArticleV2 } from './client_v2';

const ARTICLE: ArticleV2 = {
  schema: 'article/v2',
  doc_id: 'deadbeef',
  company_key: 'apple',
  company_name: 'Apple',
  category_key: 'tech',
  category_name: 'Tech',
  source_kind: 'sitemap',
  url: 'https://apple.com/x',
  canonical_url: 'https://apple.com/canonical',
  title: 'Title',
  summary: 'Summary',
  body_markdown: '# body',
  published_at: '2026-08-25T00:00:00Z',
  first_seen_at: '2026-08-20T00:00:00Z',
  content_hash: 'h',
};

describe('articleV2ToSummary', () => {
  it('maps v2 fields onto the ArticleSummary shape the cards consume', () => {
    const s = articleV2ToSummary(ARTICLE);
    // document_id == doc_id keeps permalinks stable across the migration
    expect(s.document_id).toBe('deadbeef');
    expect(s.company_key).toBe('apple');
    expect(s.company_name).toBe('Apple');
    expect(s.title).toBe('Title');
    expect(s.summary).toBe('Summary');
    expect(s.canonical_url).toBe('https://apple.com/canonical');
    expect(s.published_at).toBe('2026-08-25T00:00:00Z');
    // fetched_at has no v2 article source -> falls back to the stable first_seen_at
    expect(s.fetched_at).toBe('2026-08-20T00:00:00Z');
  });
});
