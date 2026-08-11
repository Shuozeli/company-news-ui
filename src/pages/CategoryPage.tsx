import {
  Anchor,
  Breadcrumbs,
  Container,
  Group,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconArrowRight, IconSearch } from '@tabler/icons-react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ArticleGridSkeleton, ErrorState } from '../components/StateViews';
import { dataClient } from '../data/client';
import type { CompanyDirectoryEntry } from '../data/types';
import { useIndex } from '../hooks/useIndex';
import { formatCompactCount, formatCount, formatDate } from '../lib/format';
import { companyHref, exploreHref } from '../lib/routes';

type SortMode = 'articles' | 'recent' | 'name';

const SORT_OPTIONS = [
  { label: 'Most articles', value: 'articles' },
  { label: 'Recently updated', value: 'recent' },
  { label: 'A–Z', value: 'name' },
];

function toTime(value: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function sortCompanies(
  companies: CompanyDirectoryEntry[],
  mode: SortMode,
): CompanyDirectoryEntry[] {
  const copy = [...companies];
  switch (mode) {
    case 'articles':
      return copy.sort(
        (a, b) =>
          b.record_count - a.record_count ||
          a.company_name.localeCompare(b.company_name),
      );
    case 'recent':
      return copy.sort(
        (a, b) =>
          toTime(b.last_published_at) - toTime(a.last_published_at) ||
          a.company_name.localeCompare(b.company_name),
      );
    case 'name':
      return copy.sort((a, b) => a.company_name.localeCompare(b.company_name));
    default: {
      const exhaustive: never = mode;
      return exhaustive;
    }
  }
}

export function CategoryPage() {
  const { categoryKey = '' } = useParams();
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('articles');
  const indexQuery = useIndex();
  const index = indexQuery.data;
  const categoryManifestPath = index?.paths.category_directory_manifest;
  const taxonomyGeneration = index?.taxonomy_generation;

  const directoryQuery = useQuery({
    queryKey: ['category-directory', index?.generation, taxonomyGeneration],
    enabled: Boolean(index && categoryManifestPath && taxonomyGeneration),
    staleTime: 60_000,
    queryFn: ({ signal }) => {
      if (!index || !categoryManifestPath || !taxonomyGeneration) {
        throw new Error('Category directory path is unavailable');
      }
      return dataClient.getCategoryDirectory(
        categoryManifestPath,
        index.generation,
        taxonomyGeneration,
        signal,
      );
    },
  });

  const category = directoryQuery.data?.categories.find(
    (candidate) => candidate.key === categoryKey,
  );
  const pageDescriptors = category?.pages ?? [];

  const pagesQuery = useInfiniteQuery({
    queryKey: [
      'category-pages',
      index?.generation,
      taxonomyGeneration,
      category?.key,
    ],
    enabled: Boolean(index && taxonomyGeneration && pageDescriptors.length > 0),
    staleTime: Number.POSITIVE_INFINITY,
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => {
      const descriptor = pageDescriptors[pageParam];
      if (!index || !descriptor || !taxonomyGeneration) {
        throw new Error('Category page is unavailable');
      }
      return dataClient.getCategoryPage(
        descriptor.path,
        index.generation,
        taxonomyGeneration,
        signal,
      );
    },
    getNextPageParam: (_lastPage, loadedPages) =>
      loadedPages.length < pageDescriptors.length ? loadedPages.length : undefined,
  });

  // Drain every category page so sorting and search operate over the whole
  // category, not just the first alphabetical slice. Pages are small, static,
  // and served from force-cache, so this is a bounded sequential load.
  useEffect(() => {
    if (pagesQuery.hasNextPage && !pagesQuery.isFetchingNextPage) {
      void pagesQuery.fetchNextPage();
    }
  }, [
    pagesQuery.hasNextPage,
    pagesQuery.isFetchingNextPage,
    pagesQuery.data,
    pagesQuery,
  ]);

  const companies = useMemo(
    () => pagesQuery.data?.pages.flatMap((page) => page.companies) ?? [],
    [pagesQuery.data],
  );
  const loadingAll = pagesQuery.hasNextPage || pagesQuery.isFetchingNextPage;

  const visible = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    const filtered = needle
      ? companies.filter(
          (company) =>
            company.company_name.toLocaleLowerCase().includes(needle) ||
            company.company_key.toLocaleLowerCase().includes(needle),
        )
      : companies;
    return sortCompanies(filtered, sortMode);
  }, [companies, search, sortMode]);

  const crumbs = (
    <Breadcrumbs separator="/">
      <Anchor component={Link} to={exploreHref()} size="sm">
        Explore
      </Anchor>
      <Text size="sm" c="dimmed">
        {category?.name ?? categoryKey}
      </Text>
    </Breadcrumbs>
  );

  return (
    <Container size="xl" className="content-shell">
      <Stack gap="lg">
        {crumbs}

        {indexQuery.isPending || directoryQuery.isPending ? (
          <ArticleGridSkeleton count={6} />
        ) : indexQuery.isError ? (
          <ErrorState onRetry={() => void indexQuery.refetch()} />
        ) : directoryQuery.isError ? (
          <ErrorState onRetry={() => void directoryQuery.refetch()} />
        ) : !category ? (
          <ErrorState
            title="Category not found"
            message="This category is not part of the current snapshot."
          />
        ) : (
          <>
            <div className="section-heading">
              <Text className="eyebrow">Category</Text>
              <Title order={2}>{category.name}</Title>
              <Text c="dimmed" size="sm" mt={4}>
                {formatCount(category.company_count)} companies &middot;{' '}
                {formatCount(category.record_count)} articles
              </Text>
            </div>

            <Group justify="space-between" align="end" wrap="wrap" gap="md">
              <TextInput
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                placeholder="Search companies in this category"
                aria-label="Search companies in this category"
                leftSection={<IconSearch size={16} stroke={1.7} />}
                style={{ flex: '1 1 260px', maxWidth: 420 }}
              />
              <SegmentedControl
                value={sortMode}
                onChange={(value) => setSortMode(value as SortMode)}
                data={SORT_OPTIONS}
                size="sm"
              />
            </Group>

            {pagesQuery.isPending ? (
              <ArticleGridSkeleton count={6} />
            ) : pagesQuery.isError ? (
              <ErrorState onRetry={() => void pagesQuery.refetch()} />
            ) : visible.length === 0 ? (
              <div className="empty-state">
                <Text fw={650}>No matching company.</Text>
                <Text c="dimmed" size="sm">
                  {search
                    ? `Nothing in this category matches "${search}".`
                    : 'This category has no indexed companies.'}
                </Text>
              </div>
            ) : (
              <>
                <Text c="dimmed" size="sm">
                  Showing {formatCount(visible.length)}
                  {loadingAll
                    ? ` of ${formatCount(category.company_count)} (loading…)`
                    : ''}
                </Text>
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
                  {visible.map((company) => (
                    <Link
                      key={company.company_key}
                      to={companyHref(company.company_key)}
                      className="browse-card"
                    >
                      <Group justify="space-between" align="start" wrap="nowrap">
                        <span className="browse-card__mark" aria-hidden="true">
                          {company.company_name.trim()[0]?.toUpperCase() ?? '•'}
                        </span>
                        <IconArrowRight
                          className="browse-card__arrow"
                          size={18}
                          stroke={1.8}
                          aria-hidden="true"
                        />
                      </Group>
                      <span className="browse-card__title">
                        {company.company_name}
                      </span>
                      <span className="browse-card__meta">
                        {formatCompactCount(company.record_count)} articles
                        {company.last_published_at
                          ? ` · latest ${formatDate(company.last_published_at)}`
                          : ''}
                      </span>
                    </Link>
                  ))}
                </SimpleGrid>
              </>
            )}
          </>
        )}
      </Stack>
    </Container>
  );
}
