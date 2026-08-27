import {
  Button,
  Center,
  Container,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconArrowDown } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

import { ArticleCard } from '../components/ArticleCard';
import { ArticleGridSkeleton, ErrorState } from '../components/StateViews';
import type { ArticleSummary } from '../data/types';
import { useLatestArticlesV2 } from '../hooks/useV2';
import { formatCount } from '../lib/format';
import { articleHrefFor } from '../lib/routes';

// v2: the recency feed is paged by DAY. Each day file already carries summary
// rows, so a page load is one fetch and renders straight into cards -- no
// per-article body fetch.
export function LatestPage() {
  const navigate = useNavigate();
  const pagesQuery = useLatestArticlesV2();

  const openArticle = (article: ArticleSummary) => {
    navigate(articleHrefFor(article));
  };

  const articles = pagesQuery.data?.pages.flatMap((page) => page) ?? [];

  return (
    <Container size="xl" className="content-shell">
      <Stack gap="xl">
        <div className="section-heading">
          <Text className="eyebrow">Latest from the source</Text>
          <Title order={2}>Recent company updates</Title>
        </div>

        {pagesQuery.isPending ? (
          <ArticleGridSkeleton />
        ) : pagesQuery.isError ? (
          <ErrorState onRetry={() => void pagesQuery.refetch()} />
        ) : articles.length === 0 ? (
          <div className="empty-state">
            <Text fw={650}>No articles have been published yet.</Text>
            <Text c="dimmed" size="sm">
              The next generated snapshot will appear here automatically.
            </Text>
          </div>
        ) : (
          <>
            <Text c="dimmed" size="sm">
              Showing {formatCount(articles.length)}
            </Text>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
              {articles.map((article) => (
                <ArticleCard
                  key={article.document_id}
                  article={article}
                  onOpen={openArticle}
                />
              ))}
            </SimpleGrid>

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
                  Load more days
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
