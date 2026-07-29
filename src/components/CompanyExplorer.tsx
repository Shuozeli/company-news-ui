import {
  Badge,
  Button,
  Group,
  Loader,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import {
  IconArrowDown,
  IconBuilding,
  IconSearch,
} from '@tabler/icons-react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { dataClient } from '../data/client';
import type {
  ArticleSummary,
  CompanyDirectoryEntry,
  DataIndex,
} from '../data/types';
import {
  formatCompactCount,
  formatCount,
  formatDate,
} from '../lib/format';
import { ArticleCard } from './ArticleCard';
import { ArticleGridSkeleton, ErrorState } from './StateViews';

const DIRECTORY_BUCKETS = [
  ...'abcdefghijklmnopqrstuvwxyz',
  '0-9',
  'other',
];

function bucketLabel(bucket: string): string {
  if (bucket === '0-9') return '0–9';
  if (bucket === 'other') return '#';
  return bucket.toUpperCase();
}

function bucketForSearch(value: string): string | undefined {
  const character = value.trimStart()[0];
  if (!character) return undefined;
  if (/[a-z]/i.test(character)) return character.toLowerCase();
  if (/\d/.test(character)) return '0-9';
  return 'other';
}

interface CompanyExplorerProps {
  index: DataIndex;
  onOpenArticle: (article: ArticleSummary) => void;
}

export function CompanyExplorer({
  index,
  onOpenArticle,
}: CompanyExplorerProps) {
  const [selectedBucket, setSelectedBucket] = useState('a');
  const [search, setSearch] = useState('');
  const [selectedCompany, setSelectedCompany] =
    useState<CompanyDirectoryEntry | null>(null);

  const directoryQuery = useQuery({
    queryKey: ['company-directory', index.generation],
    queryFn: ({ signal }) =>
      dataClient.getCompanyDirectory(
        index.paths.company_directory_manifest,
        index.generation,
        signal,
      ),
    staleTime: Number.POSITIVE_INFINITY,
  });

  const descriptors = directoryQuery.data?.buckets ?? [];
  const availableBuckets = new Map(
    descriptors.map((descriptor) => [descriptor.bucket, descriptor]),
  );
  const effectiveBucket = availableBuckets.has(selectedBucket)
    ? selectedBucket
    : descriptors[0]?.bucket;
  const descriptor = effectiveBucket
    ? availableBuckets.get(effectiveBucket)
    : undefined;

  const bucketQuery = useQuery({
    queryKey: ['company-bucket', index.generation, effectiveBucket],
    queryFn: ({ signal }) => {
      if (!descriptor) throw new Error('Company bucket is unavailable');
      return dataClient.getCompanyBucket(
        descriptor.path,
        index.generation,
        signal,
      );
    },
    enabled: Boolean(descriptor),
    staleTime: Number.POSITIVE_INFINITY,
  });

  const companies = useMemo(() => {
    const entries = bucketQuery.data?.companies ?? [];
    const needle = search.trim().toLocaleLowerCase();
    if (!needle) return entries;
    return entries.filter(
      (entry) =>
        entry.company_name.toLocaleLowerCase().includes(needle) ||
        entry.company_key.includes(needle),
    );
  }, [bucketQuery.data, search]);

  const changeBucket = (bucket: string) => {
    setSelectedBucket(bucket);
    setSearch('');
    setSelectedCompany(null);
  };

  const changeSearch = (value: string) => {
    setSearch(value);
    const nextBucket = bucketForSearch(value);
    if (nextBucket && availableBuckets.has(nextBucket)) {
      setSelectedBucket(nextBucket);
      if (nextBucket !== effectiveBucket) setSelectedCompany(null);
    }
  };

  if (directoryQuery.isPending) {
    return <ArticleGridSkeleton count={4} />;
  }

  if (directoryQuery.isError) {
    return <ErrorState onRetry={() => void directoryQuery.refetch()} />;
  }

  return (
    <Stack gap="xl">
      <Group justify="space-between" align="end" className="section-heading">
        <div>
          <Text className="eyebrow">Browse without the bulk download</Text>
          <Title order={2}>Company directory</Title>
        </div>
        <Text c="dimmed" size="sm">
          {formatCount(directoryQuery.data.company_count)} indexed companies
        </Text>
      </Group>

      <div className="directory-toolbar">
        <TextInput
          value={search}
          onChange={(event) => changeSearch(event.currentTarget.value)}
          placeholder="Start typing a company name"
          aria-label="Search companies"
          leftSection={<IconSearch size={18} stroke={1.7} />}
          size="md"
          className="directory-search"
        />
        <Text size="xs" c="dimmed" className="directory-hint">
          Search loads one letter bucket only.
        </Text>
      </div>

      <ScrollArea type="auto" offsetScrollbars scrollbarSize={6}>
        <div className="alphabet" aria-label="Company name ranges">
          {DIRECTORY_BUCKETS.map((bucket) => {
            const bucketDescriptor = availableBuckets.get(bucket);
            return (
              <button
                type="button"
                key={bucket}
                className="alphabet__button"
                data-active={bucket === effectiveBucket || undefined}
                disabled={!bucketDescriptor}
                onClick={() => changeBucket(bucket)}
                aria-label={
                  bucketDescriptor
                    ? `${bucketLabel(bucket)}, ${bucketDescriptor.company_count} companies`
                    : `${bucketLabel(bucket)}, no companies`
                }
              >
                {bucketLabel(bucket)}
              </button>
            );
          })}
        </div>
      </ScrollArea>

      <div className="company-browser">
        <aside className="company-list" aria-label="Companies">
          <div className="company-list__header">
            <Text fw={700}>{bucketLabel(effectiveBucket ?? 'other')}</Text>
            <Badge variant="light" color="harbor">
              {formatCount(companies.length)}
            </Badge>
          </div>

          {bucketQuery.isPending ? (
            <div className="company-list__loading">
              <Loader size="sm" color="harbor" />
              <Text size="sm" c="dimmed">
                Loading this bucket…
              </Text>
            </div>
          ) : bucketQuery.isError ? (
            <div className="company-list__error">
              <Text size="sm">This bucket could not be loaded.</Text>
              <Button
                variant="subtle"
                color="ember"
                size="xs"
                onClick={() => void bucketQuery.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : companies.length === 0 ? (
            <div className="company-list__empty">
              <Text size="sm" c="dimmed">
                No company in this bucket matches “{search}”.
              </Text>
            </div>
          ) : (
            <div className="company-list__items">
              {companies.map((company) => (
                <button
                  type="button"
                  key={company.company_key}
                  className="company-row"
                  data-active={
                    selectedCompany?.company_key === company.company_key ||
                    undefined
                  }
                  onClick={() => setSelectedCompany(company)}
                >
                  <span className="company-row__mark" aria-hidden="true">
                    {company.company_name.trim()[0]?.toUpperCase() ?? '•'}
                  </span>
                  <span className="company-row__copy">
                    <span className="company-row__name">
                      {company.company_name}
                    </span>
                    <span className="company-row__meta">
                      {formatCompactCount(company.record_count)} articles
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </aside>

        <CompanyDetail
          company={selectedCompany}
          generation={index.generation}
          onOpenArticle={onOpenArticle}
        />
      </div>
    </Stack>
  );
}

interface CompanyDetailProps {
  company: CompanyDirectoryEntry | null;
  generation: string;
  onOpenArticle: (article: ArticleSummary) => void;
}

function CompanyDetail({
  company,
  generation,
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
      if (!descriptor) throw new Error('Company page descriptor is unavailable');
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
      <div className="company-detail company-detail--empty">
        <div className="company-detail__empty-mark">
          <IconBuilding size={30} stroke={1.5} />
        </div>
        <Title order={3}>Choose a company</Title>
        <Text c="dimmed" maw={410} ta="center">
          Its article index will load here. Until then, no company article files
          are requested.
        </Text>
      </div>
    );
  }

  if (manifestQuery.isPending) {
    return (
      <div className="company-detail">
        <ArticleGridSkeleton count={2} />
      </div>
    );
  }

  if (manifestQuery.isError) {
    return (
      <div className="company-detail">
        <ErrorState onRetry={() => void manifestQuery.refetch()} />
      </div>
    );
  }

  if (!manifestQuery.data.article_index) {
    return (
      <div className="company-detail">
        <ErrorState
          title="This snapshot predates company article pages"
          message="Regenerate company-news-data with the latest exporter, then refresh this page."
        />
      </div>
    );
  }

  if (pagesQuery.isError) {
    return (
      <div className="company-detail">
        <ErrorState onRetry={() => void pagesQuery.refetch()} />
      </div>
    );
  }

  const articles =
    pagesQuery.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="company-detail">
      <div className="company-detail__header">
        <div className="company-detail__identity">
          <span className="company-detail__mark" aria-hidden="true">
            {company.company_name.trim()[0]?.toUpperCase() ?? '•'}
          </span>
          <div>
            <Text className="eyebrow">Company archive</Text>
            <Title order={2}>{company.company_name}</Title>
          </div>
        </div>
        <Group gap="lg" className="company-detail__stats">
          <div>
            <Text fw={700}>{formatCount(company.record_count)}</Text>
            <Text size="xs" c="dimmed">
              articles
            </Text>
          </div>
          <div>
            <Text fw={700}>{formatDate(company.last_published_at)}</Text>
            <Text size="xs" c="dimmed">
              latest
            </Text>
          </div>
        </Group>
      </div>

      {pagesQuery.isPending ? (
        <ArticleGridSkeleton count={2} />
      ) : (
        <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="md">
          {articles.map((article) => (
            <ArticleCard
              key={article.document_id}
              article={article}
              onOpen={onOpenArticle}
            />
          ))}
        </SimpleGrid>
      )}

      {pagesQuery.hasNextPage ? (
        <Button
          variant="subtle"
          color="harbor"
          leftSection={<IconArrowDown size={16} />}
          loading={pagesQuery.isFetchingNextPage}
          onClick={() => void pagesQuery.fetchNextPage()}
          className="company-detail__more"
        >
          Load more from {company.company_name}
        </Button>
      ) : null}
    </div>
  );
}
