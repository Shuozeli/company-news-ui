import { Container, Stack, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';

import { CategoryGrid } from '../components/CategoryGrid';
import { ArticleGridSkeleton, ErrorState } from '../components/StateViews';
import { dataClient } from '../data/client';
import { useIndex } from '../hooks/useIndex';
import { formatCount } from '../lib/format';

export function ExplorePage() {
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

  return (
    <Container size="xl" className="content-shell">
      <Stack gap="lg">
        <div className="section-heading">
          <Text className="eyebrow">Explore</Text>
          <Title order={2}>Browse by category</Title>
        </div>

        {indexQuery.isPending || directoryQuery.isPending ? (
          <ArticleGridSkeleton count={6} />
        ) : indexQuery.isError ? (
          <ErrorState onRetry={() => void indexQuery.refetch()} />
        ) : !categoryManifestPath || !taxonomyGeneration ? (
          <ErrorState
            title="This snapshot does not include the category tree"
            message="Publish company-news-data with the taxonomy-aware exporter, then refresh this reader."
          />
        ) : directoryQuery.isError ? (
          <ErrorState onRetry={() => void directoryQuery.refetch()} />
        ) : (
          <>
            <Text c="dimmed" size="sm">
              {formatCount(directoryQuery.data.category_count)} categories &middot;{' '}
              {formatCount(directoryQuery.data.company_count)} companies
            </Text>
            <CategoryGrid categories={directoryQuery.data.categories} />
          </>
        )}
      </Stack>
    </Container>
  );
}
