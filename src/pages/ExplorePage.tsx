import { Container, Stack, Text, Title } from '@mantine/core';

import { CategoryGrid } from '../components/CategoryGrid';
import { ArticleGridSkeleton, ErrorState } from '../components/StateViews';
import { useCategoryDirectoryV2 } from '../hooks/useV2';
import { formatCount } from '../lib/format';

// v2: the category directory is a single `taxonomy/directory.json` (all
// categories + aggregate counts), so no manifest-path indirection is needed.
export function ExplorePage() {
  const directoryQuery = useCategoryDirectoryV2();
  const directory = directoryQuery.data;

  return (
    <Container size="xl" className="content-shell">
      <Stack gap="lg">
        <div className="section-heading">
          <Text className="eyebrow">Explore</Text>
          <Title order={2}>Browse by category</Title>
        </div>

        {directoryQuery.isPending ? (
          <ArticleGridSkeleton count={6} />
        ) : directoryQuery.isError || !directory ? (
          <ErrorState onRetry={() => void directoryQuery.refetch()} />
        ) : (
          <>
            <Text c="dimmed" size="sm">
              {formatCount(directory.category_count)} categories &middot;{' '}
              {formatCount(directory.company_count)} companies
            </Text>
            <CategoryGrid categories={directory.categories} />
          </>
        )}
      </Stack>
    </Container>
  );
}
