# Company News UI

A static Vite, React, and Mantine reader for
[`company-news-data`](https://github.com/Shuozeli/company-news-data).

[Open the public reader](https://shuozeli.github.io/company-news-ui/).

The UI is intentionally separate from the multi-gigabyte data repository. It
starts with one small `index.json` request and follows paths declared by that
snapshot:

```text
index.json
├── recent/manifest.json
│   └── pages/000001.json       # 50 summaries per request
└── categories/manifest.json
    └── <category-key>/pages/000001.json # 100 companies per request
        └── Microsoft → company.json
            └── pages/000001.json
                ├── record.json # fetched only after article click
                └── article.md  # fetched only after article click
```

Normal browser navigation never downloads the full-text JSONL search shards.
Article pages carry the dataset generation as a cache key. Category buckets
carry both the dataset and taxonomy generations, so article counts and category
corrections invalidate independently without changing article identity. Both
generations are checked to detect mixed snapshots.

## Development

```bash
pnpm install
pnpm dev
pnpm test
pnpm lint
pnpm build
```

The production build remains a normal Vite SPA with relative asset paths, so it
can be served from GitHub Pages or any static subdirectory. Its final Sites
packaging step adds a small standards-based `fetch()` worker at
`dist/server/index.js` and copies project metadata into `dist/.openai/`. The
worker delegates static files to the hosting provider's `ASSETS` binding and
provides an HTML fallback for client-side routes.

The default data source is the raw `main` branch of `company-news-data`. To use
another compatible location:

```bash
cp .env.example .env.local
```

Then edit `VITE_DATA_BASE_URL`. The base URL must end at the repository root and
serve the OpenAPI/JSON Schema compatible static tree.

## Data-loading budget

| User action | Static files requested |
| --- | --- |
| Open reader | `index.json`, category directory, first 100-company page |
| Select a category | Its first 100-company page |
| Load more companies | One additional 100-company page |
| Select a company | One company manifest and its first summary page |
| Load more | One additional 50-summary page |
| Open Latest | Recent manifest and its first 50-summary page |
| Open an article | Its `record.json` and `article.md` |

## License

The UI source is MIT licensed. Article content remains subject to the rights of
its original publisher; see the data repository's `CONTENT_RIGHTS.md`.
