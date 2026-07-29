# Company News UI

A static Vite, React, and Mantine reader for
[`company-news-data`](https://github.com/Shuozeli/company-news-data).

The UI is intentionally separate from the multi-gigabyte data repository. It
starts with one small `index.json` request and follows paths declared by that
snapshot:

```text
index.json
├── recent/manifest.json
│   └── pages/000001.json       # 50 summaries per request
└── companies/manifest.json
    └── buckets/m.json          # one name bucket per request
        └── company.json
            └── pages/000001.json
                ├── record.json # fetched only after article click
                └── article.md  # fetched only after article click
```

Normal browser navigation never downloads the full-text JSONL search shards.
Every mutable static request carries the current dataset generation as a cache
key, and generation-bearing responses are checked to detect mixed snapshots.

## Development

```bash
pnpm install
pnpm dev
pnpm test
pnpm lint
pnpm build
```

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
| Open reader | `index.json`, recent manifest, first 50-summary page |
| Load more | One additional 50-summary page |
| Open Companies | Company directory manifest |
| Select/search a letter | One alphabetical bucket |
| Select a company | One company manifest and its first summary page |
| Open an article | Its `record.json` and `article.md` |

## License

The UI source is MIT licensed. Article content remains subject to the rights of
its original publisher; see the data repository's `CONTENT_RIGHTS.md`.
