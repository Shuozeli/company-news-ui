import {
  Anchor,
  Breadcrumbs,
  Button,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  IconArrowDown,
  IconChevronRight,
  IconFileText,
} from '@tabler/icons-react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

import { ArticleGridSkeleton, ErrorState } from '../components/StateViews';
import { dataClient } from '../data/client';
import { useCompanyEntry } from '../hooks/useCompanyData';
import { useIndex } from '../hooks/useIndex';
import { formatCount, formatDate } from '../lib/format';
import { articleHrefFor, exploreHref } from '../lib/routes';

export function CompanyPage() {
  const { companyKey = '' } = useParams();
  const indexQuery = useIndex();
  const index = indexQuery.data;
  const generation = index?.generation;
  const directoryManifestPath = index?.paths.company_directory_manifest;

  const entryQuery = useCompanyEntry(
    companyKey,
    directoryManifestPath,
    generation,
  );
  const entry = entryQuery.data;

  const manifestQuery = useQuery({
    queryKey: ['company-manifest', generation, entry?.company_key],
    enabled: Boolean(entry && generation),
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: ({ signal }) => {
      if (!entry || !generation) throw new Error('No company selected');
      return dataClient.getCompanyManifest(
        entry.company_manifest_path,
        generation,
        signal,
      );
    },
  });

  const descriptors = manifestQuery.data?.article_index?.pages ?? [];
  const pagesQuery = useInfiniteQuery({
    queryKey: ['company-pages', generation, entry?.company_key],
    enabled: Boolean(generation && descriptors.length > 0),
    staleTime: Number.POSITIVE_INFINITY,
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => {
      const descriptor = descriptors[pageParam];
      if (!descriptor || !generation) {
        throw new Error('Company page descriptor is unavailable');
      }
      return dataClient.getBrowsePage(descriptor.path, generation, signal);
    },
    getNextPageParam: (_lastPage, loadedPages) =>
      loadedPages.length < descriptors.length ? loadedPages.length : undefined,
  });

  const articles = pagesQuery.data?.pages.flatMap((page) => page.items) ?? [];

  const crumbs = (
    <Breadcrumbs separator="/">
      <Anchor component={Link} to={exploreHref()} size="sm">
        Explore
      </Anchor>
      <Text size="sm" c="dimmed">
        {entry?.company_name ?? companyKey}
      </Text>
    </Breadcrumbs>
  );

  return (
    <Container size="xl" className="content-shell">
      <Stack gap="lg">
        {crumbs}

        {indexQuery.isPending || entryQuery.isPending ? (
          <ArticleGridSkeleton count={4} />
        ) : indexQuery.isError ? (
          <ErrorState onRetry={() => void indexQuery.refetch()} />
        ) : entryQuery.isError ? (
          <ErrorState
            title="Company not found"
            message="This company is not part of the current snapshot."
            onRetry={() => void entryQuery.refetch()}
          />
        ) : !entry ? (
          <ErrorState title="Company not found" />
        ) : (
          <>
            <div className="section-heading">
              <Group gap="sm" align="center">
                <span className="company-hero__mark" aria-hidden="true">
                  {entry.company_name.trim()[0]?.toUpperCase() ?? '•'}
                </span>
                <div>
                  <Text className="eyebrow">Company</Text>
                  <Title order={2}>{entry.company_name}</Title>
                </div>
              </Group>
              <Text c="dimmed" size="sm" mt={6}>
                {formatCount(entry.record_count)} articles &middot; latest{' '}
                {formatDate(entry.last_published_at)}
              </Text>
            </div>

            {manifestQuery.isPending ? (
              <ArticleGridSkeleton count={3} />
            ) : manifestQuery.isError ? (
              <ErrorState onRetry={() => void manifestQuery.refetch()} />
            ) : !manifestQuery.data.article_index ? (
              <ErrorState
                title="This snapshot predates company article pages"
                message="Regenerate company-news-data with the latest exporter, then refresh this page."
              />
            ) : pagesQuery.isError ? (
              <ErrorState onRetry={() => void pagesQuery.refetch()} />
            ) : pagesQuery.isPending ? (
              <ArticleGridSkeleton count={3} />
            ) : articles.length === 0 ? (
              <div className="empty-state">
                <Text fw={650}>No articles indexed for this company.</Text>
              </div>
            ) : (
              <div className="article-list" aria-label="Company article list">
                {articles.map((article) => (
                  <Link
                    key={article.document_id}
                    to={articleHrefFor(article)}
                    state={{ article }}
                    className="article-row"
                    aria-label={`Read ${article.title}`}
                  >
                    <span className="article-row__icon" aria-hidden="true">
                      <IconFileText size={17} stroke={1.7} />
                    </span>
                    <span className="article-row__copy">
                      <span className="article-row__topline">
                        <span>
                          {formatDate(
                            article.published_at ?? article.fetched_at,
                          )}
                        </span>
                        <span>{article.source_kind}</span>
                      </span>
                      <span className="article-row__title">{article.title}</span>
                      {article.summary ? (
                        <span className="article-row__summary">
                          {article.summary}
                        </span>
                      ) : null}
                    </span>
                    <IconChevronRight
                      className="article-row__chevron"
                      size={16}
                      stroke={1.8}
                      aria-hidden="true"
                    />
                  </Link>
                ))}
              </div>
            )}

            {pagesQuery.hasNextPage ? (
              <Group justify="center">
                <Button
                  variant="outline"
                  color="harbor"
                  radius="xl"
                  leftSection={<IconArrowDown size={16} />}
                  loading={pagesQuery.isFetchingNextPage}
                  onClick={() => void pagesQuery.fetchNextPage()}
                >
                  Load more from {entry.company_name}
                </Button>
              </Group>
            ) : null}
          </>
        )}
      </Stack>
    </Container>
  );
}
