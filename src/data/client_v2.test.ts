import { describe, expect, it, vi } from 'vitest';

import { CompanyNewsDataClientV2, type ArchiveConfigV2, type ArticleV2 } from './client_v2';
import { selector } from './selector';

const BASE = 'https://data.example.test/main/';

const CONFIG: ArchiveConfigV2 = {
  archive_version: 'v2',
  generation: 'gen123',
  generated_at: 'gen-gen123',
  record_count: 1,
  company_count: 1,
  articles_scheme: { current: 'v1', v1: { salt: 'cnd/articles/v1', bucket_count: 16 } },
  companies_scheme: { current: 'v1', v1: { salt: 'cnd/companies/v1', bucket_count: 16 } },
};

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
function text(body: string) {
  return new Response(body, { status: 200, headers: { 'Content-Type': 'application/x-ndjson' } });
}

describe('v2 data client', () => {
  it('resolves an article permalink via the shard selector, no scan', async () => {
    const docId = 'a3f19c7b2e4d0011223344556677889900aabbccddeeff00112233445566aabb';
    const bucket = await selector(docId, 'cnd/articles/v1', 16);
    const pad = bucket.toString().padStart(3, '0');
    const article: ArticleV2 = {
      schema: 'article/v2',
      doc_id: docId,
      company_key: 'apple',
      company_name: 'Apple',
      category_key: 'tech',
      category_name: 'Tech',
      source_kind: 'sitemap',
      url: 'https://apple.com/x',
      canonical_url: 'https://apple.com/x',
      title: 'X',
      summary: 's',
      body_markdown: 'b',
      published_at: '2026-08-25T00:00:00Z',
      first_seen_at: '2026-08-25T00:00:00Z',
      content_hash: 'h',
    };

    const seen: string[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const u = new URL(String(input));
      const p = u.pathname;
      seen.push(p);
      if (p.endsWith('/v2/config.json')) return json(CONFIG);
      if (p.endsWith(`/v2/index/articles/v1/${pad}.jsonl`)) {
        return text(JSON.stringify({ doc_id: docId, date: '2026/08/25', company_key: 'apple' }) + '\n');
      }
      if (p.endsWith(`/v2/data/2026/08/25/${docId}.json`)) return json(article);
      return new Response('not found', { status: 404 });
    });

    const client = new CompanyNewsDataClientV2(BASE);
    const got = await client.getArticle(docId);
    expect(got.doc_id).toBe(docId);
    expect(got.title).toBe('X');
    // it went config -> the CORRECT bucket file -> the data file
    expect(seen.some((p) => p.endsWith(`/v2/index/articles/v1/${pad}.jsonl`))).toBe(true);
    expect(seen.some((p) => p.endsWith(`/v2/data/2026/08/25/${docId}.json`))).toBe(true);
  });

  it('walks the recent feed: days -> day summary rows (the latest path)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const p = new URL(String(input)).pathname;
      if (p.endsWith('/v2/config.json')) return json(CONFIG);
      if (p.endsWith('/v2/index/recent/days.json')) {
        return json({ days: ['2026/08/26', '2026/08/25'] });
      }
      if (p.endsWith('/v2/index/recent/2026/08/26.json')) {
        return json({
          date: '2026/08/26',
          articles: [
            {
              doc_id: 'doc26',
              company_key: 'apple',
              company_name: 'Apple',
              source_kind: 'sitemap',
              title: 'Latest',
              summary: 's',
              published_at: '2026-08-26T00:00:00Z',
              first_seen_at: '2026-08-26T00:00:00Z',
            },
          ],
        });
      }
      return new Response('not found', { status: 404 });
    });

    const client = new CompanyNewsDataClientV2(BASE);
    const days = await client.getRecentDays();
    expect(days[0]).toBe('2026/08/26');
    const rows = await client.getDay(days[0]);
    // renders straight from the index -- no per-article data-file fetch
    expect(rows.map((r) => r.doc_id)).toEqual(['doc26']);
    expect(rows[0].title).toBe('Latest');
  });

  it('resolves a company: months bucket -> per-month summary rows (the company path)', async () => {
    const companyKey = 'apple';
    const bucket = await selector(companyKey, 'cnd/companies/v1', 16);
    const pad = bucket.toString().padStart(3, '0');
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const p = new URL(String(input)).pathname;
      if (p.endsWith('/v2/config.json')) return json(CONFIG);
      if (p.endsWith(`/v2/index/companies/_index/v1/${pad}.jsonl`)) {
        return text(
          JSON.stringify({
            company_key: companyKey,
            company_name: 'Apple',
            article_count: 2,
            months: ['2026-08', '2026-07'],
          }) + '\n',
        );
      }
      if (p.endsWith('/v2/index/companies/apple/2026-08.json')) {
        return json({
          articles: [
            { doc_id: 'a1', company_key: 'apple', company_name: 'Apple', source_kind: 'sitemap', title: 'A1', summary: '', published_at: null, first_seen_at: '2026-08-01T00:00:00Z' },
            { doc_id: 'a2', company_key: 'apple', company_name: 'Apple', source_kind: 'sitemap', title: 'A2', summary: '', published_at: null, first_seen_at: '2026-08-02T00:00:00Z' },
          ],
        });
      }
      return new Response('not found', { status: 404 });
    });

    const client = new CompanyNewsDataClientV2(BASE);
    const row = await client.getCompanyMonths(companyKey);
    expect(row?.months).toEqual(['2026-08', '2026-07']);
    const rows = await client.getCompanyMonth(companyKey, row!.months[0]);
    expect(rows.map((r) => r.doc_id)).toEqual(['a1', 'a2']);
  });

  it('reads the taxonomy directory and a category file (the explore path)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const p = new URL(String(input)).pathname;
      if (p.endsWith('/v2/config.json')) return json(CONFIG);
      if (p.endsWith('/v2/taxonomy/directory.json')) {
        return json({
          taxonomy_generation: 'tax1',
          category_count: 1,
          company_count: 2,
          record_count: 3,
          categories: [{ key: 'tech', name: 'Tech', company_count: 2, record_count: 3 }],
        });
      }
      if (p.endsWith('/v2/taxonomy/categories/tech.json')) {
        return json({
          key: 'tech',
          name: 'Tech',
          company_count: 2,
          record_count: 3,
          companies: [
            { company_key: 'apple', company_name: 'Apple', record_count: 2, last_published_at: '2026-08-25T00:00:00Z' },
            { company_key: 'google', company_name: 'Google', record_count: 1, last_published_at: null },
          ],
        });
      }
      return new Response('not found', { status: 404 });
    });

    const client = new CompanyNewsDataClientV2(BASE);
    const dir = await client.getCategoryDirectory();
    expect(dir.categories[0].key).toBe('tech');
    const cat = await client.getCategory('tech');
    expect(cat.companies.map((c) => c.company_key)).toEqual(['apple', 'google']);
  });
});
