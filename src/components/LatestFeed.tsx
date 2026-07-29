import { Button, Center, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconArrowDown } from '@tabler/icons-react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { dataClient } from '../data/client';
import type { ArticleSummary, DataIndex } from '../data/types';
import { formatCount } from '../lib/format';
import { ArticleCard } from './ArticleCard';
import { ArticleGridSkeleton, ErrorState } from './StateViews';

interface LatestFeedProps {
  index: DataIndex;
  onOpenArticle: (article: ArticleSummary) => void;
}

export function LatestFeed({ index, onOpenArticle }: LatestFeedProps) {
  const manifestQuery = useQuery({
    queryKey: ['recent-manifest', index.generation],
    queryFn: ({ signal }) =>
      dataClient.getRecentManifest(
        index.paths.recent_manifest,
        index.generation,
        signal,
      ),
    staleTime: Number.POSITIVE_INFINITY,
  });

  const descriptors = manifestQuery.data?.pages ?? [];
  const pagesQuery = useInfiniteQuery({
    queryKey: ['recent-pages', index.generation],
    queryFn: ({ pageParam, signal }) => {
      const descriptor = descriptors[pageParam];
      if (!descriptor) throw new Error('Recent page descriptor is unavailable');
      return dataClient.getBrowsePage(
        descriptor.path,
        index.generation,
        signal,
      );
    },
    initialPageParam: 0,
    getNextPageParam: (_lastPage, loadedPages) =>
      loadedPages.length < descriptors.length ? loadedPages.length : undefined,
    enabled: descriptors.length > 0,
    staleTime: Number.POSITIVE_INFINITY,
  });

  if (manifestQuery.isPending) {
    return <ArticleGridSkeleton />;
  }

  if (manifestQuery.isError) {
    return <ErrorState onRetry={() => void manifestQuery.refetch()} />;
  }

  if (manifestQuery.data.record_count === 0) {
    return (
      <div className="empty-state">
        <Text fw={650}>No articles have been published yet.</Text>
        <Text c="dimmed" size="sm">
          The next generated snapshot will appear here automatically.
        </Text>
      </div>
    );
  }

  if (pagesQuery.isError) {
    return <ErrorState onRetry={() => void pagesQuery.refetch()} />;
  }

  const articles =
    pagesQuery.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <Stack gap="xl">
      <Group justify="space-between" align="end" className="section-heading">
        <div>
          <Text className="eyebrow">Latest from the source</Text>
          <Title order={2}>Recent company updates</Title>
        </div>
        <Text c="dimmed" size="sm">
          Showing {formatCount(articles.length)} of{' '}
          {formatCount(manifestQuery.data.record_count)}
        </Text>
      </Group>

      {pagesQuery.isPending ? (
        <ArticleGridSkeleton />
      ) : (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
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
    </Stack>
  );
}
