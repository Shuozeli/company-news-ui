import { describe, expect, it, vi } from 'vitest';

import {
  assertRelativeDataPath,
  CompanyNewsDataClient,
  DataRequestError,
  stripArchiveFrontmatter,
} from './client';

describe('static data client', () => {
  it('rejects paths that can escape the repository base URL', () => {
    for (const path of [
      '',
      '/index.json',
      '../index.json',
      'index/../index.json',
      'https://example.com/index.json',
      'index.json?raw=1',
      'index\\file.json',
    ]) {
      expect(() => assertRelativeDataPath(path)).toThrow(DataRequestError);
    }
    expect(() =>
      assertRelativeDataPath('index/v1/current/recent/manifest.json'),
    ).not.toThrow();
  });

  it('adds a generation cache key and validates page generations', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            schema_version: '1.0.0',
            generation: 'abc',
            page: 1,
            record_count: 1,
            items: [],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    const client = new CompanyNewsDataClient('https://data.example.test/main/');

    await client.getBrowsePage('pages/000001.json', 'abc');

    const requestUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(requestUrl).toBe(
      'https://data.example.test/main/pages/000001.json?generation=abc',
    );
  });

  it('detects a torn dataset read', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          schema_version: '1.0.0',
          generation: 'newer',
          page: 1,
          record_count: 1,
          items: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const client = new CompanyNewsDataClient('https://data.example.test/main/');

    await expect(
      client.getBrowsePage('pages/000001.json', 'expected'),
    ).rejects.toThrow('dataset changed');
  });
});

describe('article markdown cleanup', () => {
  it('removes archive metadata and the duplicate top-level title', () => {
    expect(
      stripArchiveFrontmatter(
        '---\ntitle: "Example"\n---\n\n# Example\n\nFirst paragraph.',
      ),
    ).toBe('First paragraph.');
  });
});
