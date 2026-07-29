import {
  Badge,
  Button,
  Group,
  Loader,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import {
  IconArrowDown,
  IconBuilding,
  IconChevronRight,
  IconFileText,
  IconFolder,
  IconFolderOpen,
  IconSearch,
  IconSitemap,
} from '@tabler/icons-react';
import { useMediaQuery } from '@mantine/hooks';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import { dataClient } from '../data/client';
import type {
  ArticleSummary,
  CategoryDescriptor,
  CompanyDirectoryEntry,
  DataIndex,
} from '../data/types';
import {
  formatCompactCount,
  formatCount,
  formatDate,
} from '../lib/format';
import { ArticleGridSkeleton, ErrorState } from './StateViews';

function queryValue(name: string): string | null {
  return new URLSearchParams(window.location.search).get(name);
}

function updateSelectionUrl(categoryKey: string, companyKey?: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set('category', categoryKey);
  if (companyKey) url.searchParams.set('company', companyKey);
  else url.searchParams.delete('company');
  window.history.pushState(null, '', url);
}

function handleTreeNavigation(
  event: React.KeyboardEvent<HTMLButtonElement>,
): void {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
  const tree = event.currentTarget.closest('[role="tree"]');
  const items = tree
    ? Array.from(
        tree.querySelectorAll<HTMLButtonElement>('[role="treeitem"]'),
      )
    : [];
  const currentIndex = items.indexOf(event.currentTarget);
  if (currentIndex < 0 || items.length === 0) return;

  event.preventDefault();
  const nextIndex =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? items.length - 1
        : event.key === 'ArrowDown'
          ? Math.min(items.length - 1, currentIndex + 1)
          : Math.max(0, currentIndex - 1);
  items[nextIndex]?.focus();
}

interface CompanyExplorerProps {
  index: DataIndex;
  onOpenArticle: (article: ArticleSummary) => void;
}

export function CompanyExplorer({
  index,
  onOpenArticle,
}: CompanyExplorerProps) {
  const categoryManifestPath = index.paths.category_directory_manifest;
  const taxonomyGeneration = index.taxonomy_generation;
  const [selectedCategoryKey, setSelectedCategoryKey] = useState(
    () => queryValue('category') ?? '',
  );
  const [selectedCompanyKey, setSelectedCompanyKey] = useState<string | null>(
    () => queryValue('company'),
  );
  const [search, setSearch] = useState('');
  const companyPaneRef = useRef<HTMLElement>(null);
  const articlePaneRef = useRef<HTMLElement>(null);
  const isMobile = useMediaQuery('(max-width: 48em)');

  const directoryQuery = useQuery({
    queryKey: [
      'category-directory',
      index.generation,
      taxonomyGeneration,
    ],
    queryFn: ({ signal }) => {
      if (!categoryManifestPath || !taxonomyGeneration) {
        throw new Error('Category directory path is unavailable');
      }
      return dataClient.getCategoryDirectory(
        categoryManifestPath,
        index.generation,
        taxonomyGeneration,
        signal,
      );
    },
    enabled: Boolean(categoryManifestPath && taxonomyGeneration),
    staleTime: 60_000,
  });

  const categories = directoryQuery.data?.categories ?? [];
  const selectedCategory =
    categories.find((category) => category.key === selectedCategoryKey) ??
    categories.find((category) => category.name === 'Technology') ??
    categories[0];

  const categoryPageDescriptors = selectedCategory?.pages ?? [];
  const categoryPagesQuery = useInfiniteQuery({
    queryKey: [
      'category-pages',
      index.generation,
      taxonomyGeneration,
      selectedCategory?.key,
    ],
    queryFn: ({ pageParam, signal }) => {
      const descriptor = categoryPageDescriptors[pageParam];
      if (!descriptor || !taxonomyGeneration) {
        throw new Error('Category page is unavailable');
      }
      return dataClient.getCategoryPage(
        descriptor.path,
        index.generation,
        taxonomyGeneration,
        signal,
      );
    },
    initialPageParam: 0,
    getNextPageParam: (_lastPage, loadedPages) =>
      loadedPages.length < categoryPageDescriptors.length
        ? loadedPages.length
        : undefined,
    enabled: categoryPageDescriptors.length > 0,
    staleTime: Number.POSITIVE_INFINITY,
  });

  const allCompanies = useMemo(
    () =>
      categoryPagesQuery.data?.pages.flatMap((page) => page.companies) ?? [],
    [categoryPagesQuery.data],
  );
  const companies = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    if (!needle) return allCompanies;
    const matches = allCompanies.filter(
      (company) =>
        company.company_name.toLocaleLowerCase().includes(needle) ||
        company.company_key.toLocaleLowerCase().includes(needle),
    );
    const selected = allCompanies.find(
      (company) => company.company_key === selectedCompanyKey,
    );
    return selected && !matches.includes(selected)
      ? [selected, ...matches]
      : matches;
  }, [allCompanies, search, selectedCompanyKey]);
  const selectedCompany =
    allCompanies.find(
      (company) => company.company_key === selectedCompanyKey,
    ) ?? null;

  const selectCategory = (category: CategoryDescriptor) => {
    setSelectedCategoryKey(category.key);
    setSelectedCompanyKey(null);
    setSearch('');
    updateSelectionUrl(category.key);
    if (isMobile) {
      requestAnimationFrame(() => {
        companyPaneRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
        companyPaneRef.current?.focus({ preventScroll: true });
      });
    }
  };

  const selectCompany = (company: CompanyDirectoryEntry) => {
    if (!selectedCategory) return;
    setSelectedCompanyKey(company.company_key);
    updateSelectionUrl(selectedCategory.key, company.company_key);
    if (isMobile) {
      requestAnimationFrame(() => {
        articlePaneRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
        articlePaneRef.current?.focus({ preventScroll: true });
      });
    }
  };

  useEffect(() => {
    const syncSelectionFromUrl = () => {
      setSelectedCategoryKey(queryValue('category') ?? '');
      setSelectedCompanyKey(queryValue('company'));
    };
    window.addEventListener('popstate', syncSelectionFromUrl);
    return () => window.removeEventListener('popstate', syncSelectionFromUrl);
  }, []);

  if (!categoryManifestPath || !taxonomyGeneration) {
    return (
      <ErrorState
        title="This snapshot does not include the category tree"
        message="Publish company-news-data with the taxonomy-aware exporter, then refresh this reader."
      />
    );
  }

  if (directoryQuery.isPending) {
    return <ArticleGridSkeleton count={4} />;
  }

  if (directoryQuery.isError) {
    return <ErrorState onRetry={() => void directoryQuery.refetch()} />;
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="end" className="section-heading">
        <div>
          <Text className="eyebrow">Category → company → article</Text>
          <Title order={2}>Browse the company-news tree</Title>
        </div>
        <Text c="dimmed" size="sm">
          {formatCount(directoryQuery.data.category_count)} categories ·{' '}
          {formatCount(directoryQuery.data.company_count)} companies
        </Text>
      </Group>

      <div className="taxonomy-browser">
        <aside
          className="tree-pane tree-pane--categories"
          aria-label="Company categories"
        >
          <div className="tree-pane__header">
            <Group gap="xs">
              <IconSitemap size={17} stroke={1.8} />
              <Text fw={750} size="sm">
                Categories
              </Text>
            </Group>
            <Badge variant="light" color="harbor" size="sm">
              {directoryQuery.data.category_count}
            </Badge>
          </div>

          <ScrollArea className="tree-pane__scroll" type="auto" scrollbarSize={6}>
            <nav
              className="category-tree"
              aria-label="News taxonomy"
              role="tree"
            >
              {categories.map((category) => {
                const active = category.key === selectedCategory?.key;
                return (
                  <button
                    type="button"
                    key={category.key}
                    className="category-node"
                    role="treeitem"
                    aria-level={1}
                    aria-selected={active}
                    aria-expanded={active}
                    tabIndex={active ? 0 : -1}
                    data-active={active || undefined}
                    aria-current={active ? 'true' : undefined}
                    onKeyDown={handleTreeNavigation}
                    onClick={() => selectCategory(category)}
                  >
                    <span className="category-node__folder" aria-hidden="true">
                      {active ? (
                        <IconFolderOpen size={18} stroke={1.8} />
                      ) : (
                        <IconFolder size={18} stroke={1.8} />
                      )}
                    </span>
                    <span className="category-node__copy">
                      <span className="category-node__name">
                        {category.name}
                      </span>
                      <span className="category-node__meta">
                        {formatCompactCount(category.company_count)} companies ·{' '}
                        {formatCompactCount(category.record_count)} articles
                      </span>
                    </span>
                    <IconChevronRight
                      className="category-node__chevron"
                      size={15}
                      stroke={1.8}
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </nav>
          </ScrollArea>
        </aside>

        <section
          ref={companyPaneRef}
          tabIndex={-1}
          className="tree-pane tree-pane--companies"
          aria-label={
            selectedCategory
              ? `Companies in ${selectedCategory.name}`
              : 'Companies'
          }
        >
          <div className="tree-pane__header tree-pane__header--stacked">
            <div>
              <Text className="tree-crumb">Categories /</Text>
              <Text fw={750} size="sm" lineClamp={1}>
                {selectedCategory?.name ?? 'Select a category'}
              </Text>
            </div>
            {selectedCategory ? (
              <Badge variant="light" color="ember" size="sm">
                {formatCount(selectedCategory.company_count)}
              </Badge>
            ) : null}
          </div>

          <div className="company-filter">
            <TextInput
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              placeholder="Filter loaded companies"
              aria-label="Filter loaded companies in selected category"
              leftSection={<IconSearch size={16} stroke={1.7} />}
              size="sm"
            />
          </div>

          {!selectedCategory ? (
            <PaneState>
              <Text size="sm" c="dimmed">
                This snapshot has no categorized companies.
              </Text>
            </PaneState>
          ) : categoryPageDescriptors.length === 0 ? (
            <PaneState>
              <Text size="sm" c="dimmed">
                No companies are indexed in this category.
              </Text>
            </PaneState>
          ) : categoryPagesQuery.isPending ? (
            <PaneState>
              <Loader size="sm" color="harbor" />
              <Text size="sm" c="dimmed">
                Loading this branch…
              </Text>
            </PaneState>
          ) : categoryPagesQuery.isError ? (
            <PaneState>
              <Text size="sm">This category could not be loaded.</Text>
              <Button
                variant="subtle"
                color="ember"
                size="xs"
                onClick={() => void categoryPagesQuery.refetch()}
              >
                Retry
              </Button>
            </PaneState>
          ) : companies.length === 0 ? (
            <PaneState>
              <Text size="sm" c="dimmed" ta="center">
                No company in this category matches “{search}”.
              </Text>
            </PaneState>
          ) : (
            <ScrollArea
              className="tree-pane__scroll tree-pane__scroll--companies"
              type="auto"
              scrollbarSize={6}
            >
              <div
                className="company-tree"
                role="tree"
                aria-label={`Companies in ${selectedCategory.name}`}
              >
                {companies.map((company, companyIndex) => {
                  const active =
                    company.company_key === selectedCompany?.company_key;
                  return (
                    <button
                      type="button"
                      key={company.company_key}
                      className="company-node"
                      role="treeitem"
                      aria-level={2}
                      aria-selected={active}
                      tabIndex={
                        active || (!selectedCompany && companyIndex === 0)
                          ? 0
                          : -1
                      }
                      data-active={active || undefined}
                      aria-current={active ? 'true' : undefined}
                      onKeyDown={handleTreeNavigation}
                      onClick={() => selectCompany(company)}
                    >
                      <span className="company-node__branch" aria-hidden="true" />
                      <span className="company-node__mark" aria-hidden="true">
                        {company.company_name.trim()[0]?.toUpperCase() ?? '•'}
                      </span>
                      <span className="company-node__copy">
                        <span className="company-node__name">
                          {company.company_name}
                        </span>
                        <span className="company-node__meta">
                          {formatCompactCount(company.record_count)} articles
                        </span>
                      </span>
                      <IconChevronRight
                        className="company-node__chevron"
                        size={14}
                        stroke={1.8}
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
                {categoryPagesQuery.hasNextPage ? (
                  <Button
                    variant="subtle"
                    color="harbor"
                    size="xs"
                    leftSection={<IconArrowDown size={14} />}
                    loading={categoryPagesQuery.isFetchingNextPage}
                    onClick={() => void categoryPagesQuery.fetchNextPage()}
                    className="company-tree__more"
                  >
                    Load 100 more companies
                  </Button>
                ) : null}
              </div>
            </ScrollArea>
          )}
        </section>

        <CompanyDetail
          category={selectedCategory ?? null}
          company={selectedCompany}
          generation={index.generation}
          focusRef={articlePaneRef}
          onOpenArticle={onOpenArticle}
        />
      </div>

      <Text size="xs" c="dimmed" className="tree-loading-note">
        Only the open category and selected company branch are requested. Full
        article content loads after you choose a headline.
      </Text>
    </Stack>
  );
}

function PaneState({ children }: { children: React.ReactNode }) {
  return <div className="tree-pane__state">{children}</div>;
}

interface CompanyDetailProps {
  category: CategoryDescriptor | null;
  company: CompanyDirectoryEntry | null;
  generation: string;
  focusRef: React.RefObject<HTMLElement | null>;
  onOpenArticle: (article: ArticleSummary) => void;
}

function CompanyDetail({
  category,
  company,
  generation,
  focusRef,
  onOpenArticle,
}: CompanyDetailProps) {
  const manifestQuery = useQuery({
    queryKey: ['company-manifest', generation, company?.company_key],
    queryFn: ({ signal }) => {
      if (!company) throw new Error('No company selected');
      return dataClient.getCompanyManifest(
        company.company_manifest_path,
        generation,
        signal,
      );
    },
    enabled: Boolean(company),
    staleTime: Number.POSITIVE_INFINITY,
  });

  const descriptors = manifestQuery.data?.article_index?.pages ?? [];
  const pagesQuery = useInfiniteQuery({
    queryKey: ['company-pages', generation, company?.company_key],
    queryFn: ({ pageParam, signal }) => {
      const descriptor = descriptors[pageParam];
      if (!descriptor) {
        throw new Error('Company page descriptor is unavailable');
      }
      return dataClient.getBrowsePage(descriptor.path, generation, signal);
    },
    initialPageParam: 0,
    getNextPageParam: (_lastPage, loadedPages) =>
      loadedPages.length < descriptors.length ? loadedPages.length : undefined,
    enabled: descriptors.length > 0,
    staleTime: Number.POSITIVE_INFINITY,
  });

  if (!company) {
    return (
      <section
        ref={focusRef}
        tabIndex={-1}
        className="article-branch article-branch--empty"
        aria-label="Article branch"
      >
        <div className="article-branch__empty-mark">
          <IconBuilding size={28} stroke={1.5} />
        </div>
        <Title order={3}>Choose a company</Title>
        <Text c="dimmed" maw={390} ta="center" size="sm">
          Open a company node to reveal its article branch. Nothing from the
          other companies is downloaded.
        </Text>
      </section>
    );
  }

  if (manifestQuery.isPending) {
    return (
      <section
        ref={focusRef}
        tabIndex={-1}
        className="article-branch"
        aria-label="Loading articles"
      >
        <ArticleGridSkeleton count={2} />
      </section>
    );
  }

  if (manifestQuery.isError) {
    return (
      <section
        ref={focusRef}
        tabIndex={-1}
        className="article-branch"
        aria-label="Article load error"
      >
        <ErrorState onRetry={() => void manifestQuery.refetch()} />
      </section>
    );
  }

  if (!manifestQuery.data.article_index) {
    return (
      <section
        ref={focusRef}
        tabIndex={-1}
        className="article-branch"
        aria-label="Article index unavailable"
      >
        <ErrorState
          title="This snapshot predates company article pages"
          message="Regenerate company-news-data with the latest exporter, then refresh this page."
        />
      </section>
    );
  }

  if (pagesQuery.isError) {
    return (
      <section
        ref={focusRef}
        tabIndex={-1}
        className="article-branch"
        aria-label="Article load error"
      >
        <ErrorState onRetry={() => void pagesQuery.refetch()} />
      </section>
    );
  }

  const articles = pagesQuery.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section
      ref={focusRef}
      tabIndex={-1}
      className="article-branch"
      aria-label={`Articles from ${company.company_name}`}
    >
      <div className="article-branch__header">
        <div className="article-branch__identity">
          <span className="article-branch__mark" aria-hidden="true">
            {company.company_name.trim()[0]?.toUpperCase() ?? '•'}
          </span>
          <div>
            <Text className="tree-crumb">
              Categories / {category?.name ?? 'Category'} /
            </Text>
            <Title order={3}>{company.company_name}</Title>
          </div>
        </div>
        <div className="article-branch__stats">
          <Text fw={750}>{formatCount(company.record_count)}</Text>
          <Text size="xs" c="dimmed">
            articles · latest {formatDate(company.last_published_at)}
          </Text>
        </div>
      </div>

      {descriptors.length === 0 ? (
        <PaneState>
          <Text size="sm" c="dimmed">
            No articles are indexed for this company.
          </Text>
        </PaneState>
      ) : pagesQuery.isPending ? (
        <ArticleGridSkeleton count={2} />
      ) : (
        <div className="article-tree" aria-label="Company article list">
          {articles.map((article) => (
            <button
              type="button"
              className="article-node"
              key={article.document_id}
              aria-label={`Read ${article.title}`}
              onClick={() => onOpenArticle(article)}
            >
              <span className="article-node__branch" aria-hidden="true">
                <span />
              </span>
              <span className="article-node__icon" aria-hidden="true">
                <IconFileText size={17} stroke={1.7} />
              </span>
              <span className="article-node__copy">
                <span className="article-node__topline">
                  <span>
                    {formatDate(article.published_at ?? article.fetched_at)}
                  </span>
                  <span>{article.source_kind}</span>
                </span>
                <span className="article-node__title">{article.title}</span>
                {article.summary ? (
                  <span className="article-node__summary">
                    {article.summary}
                  </span>
                ) : null}
              </span>
              <IconChevronRight
                className="article-node__chevron"
                size={16}
                stroke={1.8}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      )}

      {pagesQuery.hasNextPage ? (
        <Button
          variant="subtle"
          color="harbor"
          leftSection={<IconArrowDown size={16} />}
          loading={pagesQuery.isFetchingNextPage}
          onClick={() => void pagesQuery.fetchNextPage()}
          className="article-branch__more"
        >
          Load more from {company.company_name}
        </Button>
      ) : null}
    </section>
  );
}
