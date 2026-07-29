# Company News UI

[![Deploy reader](https://github.com/Shuozeli/company-news-ui/actions/workflows/pages.yml/badge.svg?branch=main)](https://github.com/Shuozeli/company-news-ui/actions/workflows/pages.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A static, company-first reader for a versioned archive of company newsrooms,
blogs, press pages, and engineering sources.

- [Open the live reader](https://shuozeli.github.io/company-news-ui/)
- [Open the Apple article branch](https://shuozeli.github.io/company-news-ui/?category=technology-3169ce6442acdc81&company=apple)
- [Inspect the versioned data](https://github.com/Shuozeli/company-news-data)

The reader is deliberately small at startup. It fetches one root `index.json`,
then follows only the category, company, and article paths selected by the
visitor. Full article Markdown is requested only after a headline is opened.

## Three-repository architecture

```text
company-feed-server
Discovery, source recipes, crawling, normalization, and export
          │
          ▼
company-news-data
Versioned JSON indexes, records, and Markdown article shards
          │
          ▼
company-news-ui
Vite + React + Mantine static reader
```

| Component | Repository | Responsibility |
| --- | --- | --- |
| Pipeline | [`company-feed-server`](https://github.com/Shuozeli/company-feed-server) | Discovers and checks company sources, crawls articles, and exports normalized snapshots |
| Versioned data | [`company-news-data`](https://github.com/Shuozeli/company-news-data) | Stores the generated static tree, schemas, provenance records, and article Markdown |
| Static reader | [`company-news-ui`](https://github.com/Shuozeli/company-news-ui) | Navigates the archive without a database or application server |

The static contract looks like this:

```text
index.json
├── recent/manifest.json
│   └── pages/000001.json                  # 50 summaries per request
└── categories/manifest.json
    └── <category-key>/pages/000001.json   # 100 companies per request
        └── <company>/company.json
            └── index/pages/000001.json
                ├── record.json            # fetched after article click
                └── article.md             # fetched after article click
```

Dataset and taxonomy generations are checked independently so the client can
detect a mixed snapshot rather than silently combining incompatible files.

## Data-loading budget

| User action | Static files requested |
| --- | --- |
| Open reader | `index.json`, category directory, first 100-company page, and one default company summary branch |
| Follow a company deep link | Additional 100-company category pages until that company is resolved |
| Select a category | Its first 100-company page and one default company summary branch |
| Load more companies | One additional 100-company page |
| Select a company | One company manifest and its first 50-summary page |
| Load more articles | One additional 50-summary page |
| Open Latest | Recent manifest and its first 50-summary page |
| Open an article | Its `record.json` and `article.md` |

Normal navigation never downloads the full-text JSONL search shards or article
bodies from companies the visitor has not opened.

## Development

```bash
pnpm install
pnpm dev
pnpm test
pnpm lint
pnpm build
```

The default data source is the raw `main` branch of `company-news-data`. To use
another compatible static tree:

```bash
cp .env.example .env.local
```

Set `VITE_DATA_BASE_URL` to an HTTP(S) directory that serves the same
OpenAPI/JSON Schema-compatible contract.

The GitHub Pages workflow builds a regular Vite SPA with relative asset paths.
The full `pnpm build` command also prepares the standards-based static worker
used by OpenAI Sites packaging.

## Contributing

Start with [CONTRIBUTING.md](./CONTRIBUTING.md). UI bugs belong in this
repository. Source discovery, crawl correctness, and company/article data
corrections belong in
[`company-feed-server`](https://github.com/Shuozeli/company-feed-server) or
[`company-news-data`](https://github.com/Shuozeli/company-news-data), as
described by the issue chooser.

## Rights and licensing

The reader source is MIT licensed. Archived article text, images, trademarks,
and other publisher material are not relicensed by this repository. They remain
subject to the rights and terms of their original publishers; see
[`CONTENT_RIGHTS.md`](https://github.com/Shuozeli/company-news-data/blob/main/CONTENT_RIGHTS.md).
