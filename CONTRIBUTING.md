# Contributing

Thanks for helping improve the Company News reader.

## Choose the right repository

- Reader behavior, accessibility, performance, and presentation:
  [`company-news-ui`](https://github.com/Shuozeli/company-news-ui/issues)
- Source discovery, crawl recipes, normalization, and exporter behavior:
  [`company-feed-server`](https://github.com/Shuozeli/company-feed-server/issues)
- Generated snapshot structure or a published data correction:
  [`company-news-data`](https://github.com/Shuozeli/company-news-data/issues)

Please do not edit generated article or index files through the UI repository.
Fix the responsible source or exporter so the next snapshot is reproducible.

## Propose a change

This project currently uses maintainer-led direct commits to `main`. Open an
issue before preparing a substantial change, describe the user-visible outcome,
and include screenshots or a minimal reproduction when relevant. Do not open a
pull request unless a maintainer explicitly asks for one.

For a UI change, verify the local checkout with:

```bash
pnpm install
pnpm test
pnpm lint
pnpm build:vite
```

Keep data access lazy: opening the reader must not download the whole company or
article archive. New data reads should follow paths declared by the current
snapshot and validate its generation.

## Content and source corrections

Include the company, source URL, affected article URL, observed result, expected
result, and the time you checked it. Do not paste copyrighted article bodies,
private credentials, or personal data into an issue.

By contributing reader code, you agree that it may be distributed under the
repository's MIT license. Publisher content is outside that license.
