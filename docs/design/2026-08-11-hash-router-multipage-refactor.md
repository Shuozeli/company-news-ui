<!-- agent-updated: 2026-08-11T16:40:00Z -->

# Hash-Router Multi-Page Refactor (fixes the scroll bug)

## Status

In Progress (implemented 2026-08-11, article addressing = option B per user; pending user review)

## Problem

The reader cannot scroll on some layouts (notably mobile). Root cause is
`src/styles.css` `.taxonomy-browser`:

```css
.taxonomy-browser {
  height: min(780px, calc(100vh - 110px));      /* pinned to viewport height */
  overflow: hidden;                              /* clips anything taller */
  grid-template-columns: 250px 305px minmax(0,1fr);
}
```

The category -> company -> article explorer is a single fixed-viewport-height,
`overflow:hidden` widget whose three columns each scroll internally via Mantine
`ScrollArea`. Consequences:

1. The outer page has nothing to scroll (the widget already fills the viewport),
   so page-level scroll does nothing.
2. On mobile, `250 + 305 + ...` overflows horizontally and is clipped by
   `overflow:hidden`; the third column and its content become unreachable.
3. `ArticleDrawer` (Mantine `Drawer`, `lockScroll` on by default) sets
   `overflow:hidden` on `<body>` while open; if it fails to unmount cleanly the
   whole page stays scroll-locked.

The current app has **no router**. Navigation is faked with
`?view=&category=&company=` query params driven by hand-rolled
`pushState`/`popstate`, and articles open as a `Drawer` overlay.

## Decisions (locked with the user, 2026-08-11)

- Article reading becomes a **full-page route**, not a Drawer overlay.
- The category/company/article explorer is **split into drill-down pages**
  (no more single fixed-height 3-pane widget).
- Routing uses **`react-router-dom` `HashRouter`** (static hosting on
  GitHub/Cloudflare Pages requires hash routing; no server rewrites).
- **Keep Mantine** (this refactor is scoped to routing + scroll; not a UI-lib
  migration). Project rule #8 prefers antd/AntV for monorepo UIs, but this is a
  standalone reader repo and a Mantine->antd rewrite is out of scope here.

## Data model constraints (verified against the live datayuacx26 archive)

- `article_path = articles/v1/{bucket}/{company_key}/{YYYY}/{MM}/{id[:2]}/{document_id}/article.md`.
  `{bucket}` is a hash of `company_key`, `{YYYY}/{MM}` is the publish date -
  **neither is derivable from `document_id`**, and the archive has **no global
  `document_id -> path` index**. So a bare `#/a/:documentId` route cannot resolve
  the body on a cold (shared-link) load.
- `record.json` (sibling of `article.md`) is **self-sufficient**: it carries
  `title`, `summary`, `published_at`, `urls` (canonical), `company`, `source`,
  `content`, `provenance`. So the article dir path alone yields both metadata
  (`<dir>/record.json`) and body (`<dir>/article.md`).
- `client.getArticle(recordPath, articlePath, generation)` already exists and
  returns `{record, markdown}`. `generation` comes from `index.json` (the app's
  first query). No client changes needed for the article page.
- Company directory manifest buckets companies by name prefix
  (`companies/buckets/<prefix>.json` -> `company_manifest_path`), so
  `#/c/:companyKey` is resolvable from the key alone in ~2-3 fetches.

## Article addressing (the one open fork)

Because `article_path` is not derivable from `document_id`, the article route
must carry the path. Two shapes:

- **A. Path-carrying (recommended):** `#/a/<article dir path>` (the dir under
  `articles/v1/...`). Zero-lookup, 100% robust on cold load, works even for
  articles that aged out of a manifest window. Longer URL. When navigating from a
  list we already hold `article_path`, so we also pass it via router state for an
  instant render with no refetch; the URL exists purely for shareability/back.
- **B. Pretty `#/c/:companyKey/:documentId`:** nicer URL, but a cold load must
  walk the company manifest pages to find the `document_id` and recover its
  `article_path` (extra fetches; breaks if the article is not in the currently
  published company manifest).

Recommendation: **A** for correctness; the hash URL length is a non-issue.

## Route map

```
/  (HashRouter, wrapped in <Layout> = header + footer + <ScrollToTop/>)
├─ #/                      HomePage      hero + snapshot stats + entry cards (Explore / Latest)
├─ #/explore              ExplorePage    all categories as cards
├─ #/explore/:categoryKey CategoryPage   companies in a category (list/grid, paginated)
├─ #/c/:companyKey        CompanyPage    a company's articles (list, paginated)
├─ #/latest              LatestPage     newest articles across all companies (paginated)
├─ #/a/*                  ArticlePage    full-page reader (record.json + article.md)
└─ *                      NotFoundPage   fallback
```

- `#/c/:companyKey` is reachable from a category page and from any article's
  byline, so it is a first-class route (not nested under explore).
- Deep links: every page is loadable cold from its URL (verified data paths
  above), which is the whole point of moving off in-memory `useState` view flags.

## Scroll model (the actual fix)

- Delete `.taxonomy-browser` fixed height + `overflow:hidden` + the inner
  `ScrollArea` panes. Every page is normal document flow; `<body>`/`html`
  scrolls. No element is pinned to `100vh` except optionally a sticky header.
- `<ScrollToTop/>` (a tiny `useEffect` on `useLocation().pathname`) resets scroll
  to top on navigation. Optionally preserve/restore scroll on back.
- Remove `ArticleDrawer` and its body scroll-lock entirely (article is now a
  page). This eliminates failure mode #3 above.

## Component mapping

| Old | New |
|-----|-----|
| `App.tsx` (header + hero + Tabs + Drawer, all-in-one) | `App.tsx` = `<HashRouter>` + `<Layout>`; hero moves to `HomePage` |
| `CompanyExplorer.tsx` (3-pane widget) | `ExplorePage` (categories) + `CategoryPage` (companies) + `CompanyPage` (articles) - reuse the existing `directoryQuery`, `categoryPagesQuery`, company-manifest queries |
| `ArticleDrawer.tsx` (Drawer overlay) | `ArticlePage.tsx` (full page); reuse the react-markdown render + `getArticle` |
| `LatestFeed.tsx` | `LatestPage.tsx` (wrap in a route; logic mostly unchanged) |
| `?view/category/company` query params + pushState | real routes; delete the hand-rolled history sync |
| `ArticleCard`, `StateViews`, `data/*`, `lib/*` | unchanged / reused |

## Dependencies

- Add `react-router-dom` (^7). No other new deps. Keep react-query (data),
  Mantine (UI), react-markdown/remark-gfm (article body).

## Testing

- Keep `data/client.test.ts`, `lib/companySelection.test.ts`.
- Add route-level smoke tests (render each page with a fake data client; assert
  cold-load deep links resolve). Favor the existing Fake data client over mocks.

## Rollout

1. Add router + `<Layout>` + `HomePage`, move hero; keep old explorer temporarily
   behind `#/explore` to avoid a big-bang change.
2. Split explorer into `ExplorePage`/`CategoryPage`/`CompanyPage`; delete the
   fixed-height widget CSS.
3. Add `ArticlePage`; delete `ArticleDrawer`.
4. Add `LatestPage`, `NotFoundPage`, `<ScrollToTop/>`.
5. Verify scroll on mobile widths; verify each deep link cold-loads.
