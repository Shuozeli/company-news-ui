import {
  Button,
  Center,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconArrowDown } from '@tabler/icons-react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { ArticleCard } from '../components/ArticleCard';
import { ArticleGridSkeleton, ErrorState } from '../components/StateViews';
import { dataClient } from '../data/client';
import type { ArticleSummary } from '../data/types';
import { useIndex } from '../hooks/useIndex';
import { formatCount } from '../lib/format';
import { articleHrefFor } from '../lib/routes';

export function LatestPage() {
  const navigate = useNavigate();
  const indexQuery = useIndex();
  const index = indexQuery.data;

  const openArticle = (article: ArticleSummary) => {
    navigate(articleHrefFor(article), { state: { article } });
  };

  const manifestQuery = useQuery({
    queryKey: ['recent-manifest', index?.generation],
    enabled: Boolean(index),
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: ({ signal }) => {
      if (!index) throw new Error('Index unavailable');
      return dataClient.getRecentManifest(
        index.paths.recent_manifest,
        index.generation,
        signal,
      );
    },
  });

  const descriptors = manifestQuery.data?.pages ?? [];
  const pagesQuery = useInfiniteQuery({
    queryKey: ['recent-pages', index?.generation],
    enabled: Boolean(index && descriptors.length > 0),
    staleTime: Number.POSITIVE_INFINITY,
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => {
      const descriptor = descriptors[pageParam];
      if (!index || !descriptor) {
        throw new Error('Recent page descriptor is unavailable');
      }
      return dataClient.getBrowsePage(descriptor.path, index.generation, signal);
    },
    getNextPageParam: (_lastPage, loadedPages) =>
      loadedPages.length < descriptors.length ? loadedPages.length : undefined,
  });

  const articles = pagesQuery.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <Container size="xl" className="content-shell">
      <Stack gap="xl">
        <div className="section-heading">
          <Text className="eyebrow">Latest from the source</Text>
          <Title order={2}>Recent company updates</Title>
        </div>

        {indexQuery.isPending || manifestQuery.isPending ? (
          <ArticleGridSkeleton />
        ) : indexQuery.isError ? (
          <ErrorState onRetry={() => void indexQuery.refetch()} />
        ) : manifestQuery.isError ? (
          <ErrorState onRetry={() => void manifestQuery.refetch()} />
        ) : manifestQuery.data.record_count === 0 ? (
          <div className="empty-state">
            <Text fw={650}>No articles have been published yet.</Text>
            <Text c="dimmed" size="sm">
              The next generated snapshot will appear here automatically.
            </Text>
          </div>
        ) : pagesQuery.isError ? (
          <ErrorState onRetry={() => void pagesQuery.refetch()} />
        ) : (
          <>
            <Text c="dimmed" size="sm">
              Showing {formatCount(articles.length)} of{' '}
              {formatCount(manifestQuery.data.record_count)}
            </Text>

            {pagesQuery.isPending ? (
              <ArticleGridSkeleton />
            ) : (
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                {articles.map((article) => (
                  <ArticleCard
                    key={article.document_id}
                    article={article}
                    onOpen={openArticle}
                  />
                ))}
              </SimpleGrid>
            )}

            {pagesQuery.hasNextPage ? (
              <Center>
                <Button
                  variant="outline"
                  color="harbor"
                  size="md"
                  radius="xl"
                  leftSection={<IconArrowDown size={17} />}
                  loading={pagesQuery.isFetchingNextPage}
                  onClick={() => void pagesQuery.fetchNextPage()}
                >
                  Load 50 more
                </Button>
              </Center>
            ) : articles.length > 0 ? (
              <Text ta="center" c="dimmed" size="sm" className="end-note">
                You have reached the beginning of this archive.
              </Text>
            ) : null}
          </>
        )}
      </Stack>
    </Container>
  );
}
