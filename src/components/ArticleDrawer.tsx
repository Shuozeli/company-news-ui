import {
  Badge,
  Button,
  Divider,
  Drawer,
  Group,
  Loader,
  Skeleton,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  IconArrowUpRight,
  IconCalendar,
  IconDatabase,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { dataClient, stripArchiveFrontmatter } from '../data/client';
import type { ArticleSummary } from '../data/types';
import { formatDate, formatDateTime } from '../lib/format';
import { ErrorState } from './StateViews';

interface ArticleDrawerProps {
  article: ArticleSummary | null;
  generation: string;
  onClose: () => void;
}

export function ArticleDrawer({
  article,
  generation,
  onClose,
}: ArticleDrawerProps) {
  const articleQuery = useQuery({
    queryKey: ['article', generation, article?.document_id],
    queryFn: ({ signal }) => {
      if (!article) throw new Error('No article selected');
      return dataClient.getArticle(
        article.record_path,
        article.article_path,
        generation,
        signal,
      );
    },
    enabled: Boolean(article),
    staleTime: Number.POSITIVE_INFINITY,
  });

  return (
    <Drawer
      opened={Boolean(article)}
      onClose={onClose}
      position="right"
      size="min(860px, 100%)"
      padding={0}
      overlayProps={{ backgroundOpacity: 0.36, blur: 3 }}
      classNames={{
        content: 'article-drawer',
        header: 'article-drawer__mantine-header',
        body: 'article-drawer__body',
      }}
      title={
        <Text size="sm" fw={700} className="article-drawer__label">
          Company News
        </Text>
      }
    >
      {!article ? null : (
        <article>
          <header className="article-reader__header">
            <Group gap="xs">
              <Badge variant="light" color="harbor">
                {article.company_name}
              </Badge>
              <Badge variant="outline" color="gray">
                {article.source_kind}
              </Badge>
            </Group>

            <Title order={1} className="article-reader__title">
              {article.title}
            </Title>

            {article.summary ? (
              <Text className="article-reader__dek">{article.summary}</Text>
            ) : null}

            <Group justify="space-between" align="center" gap="lg">
              <Group gap="xs" c="dimmed">
                <IconCalendar size={17} stroke={1.7} aria-hidden="true" />
                <Text size="sm">
                  {formatDate(article.published_at ?? article.fetched_at)}
                </Text>
              </Group>
              <Button
                component="a"
                href={article.canonical_url}
                target="_blank"
                rel="noreferrer"
                color="harbor"
                radius="xl"
                rightSection={<IconArrowUpRight size={16} />}
              >
                Original article
              </Button>
            </Group>
          </header>

          <Divider />

          <div className="article-reader__content">
            {articleQuery.isPending ? (
              <Stack gap="md">
                <Group gap="sm">
                  <Loader size="sm" color="harbor" />
                  <Text c="dimmed" size="sm">
                    Loading this article’s record and Markdown…
                  </Text>
                </Group>
                <Skeleton height={16} width="92%" />
                <Skeleton height={16} width="100%" />
                <Skeleton height={16} width="84%" />
                <Skeleton height={210} mt="md" />
              </Stack>
            ) : articleQuery.isError ? (
              <ErrorState onRetry={() => void articleQuery.refetch()} />
            ) : (
              <>
                <div className="markdown-body">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ href, children }) => (
                        <a href={href} target="_blank" rel="noreferrer">
                          {children}
                        </a>
                      ),
                      img: ({ src, alt }) => (
                        <img src={src} alt={alt ?? ''} loading="lazy" />
                      ),
                    }}
                  >
                    {stripArchiveFrontmatter(articleQuery.data.markdown)}
                  </ReactMarkdown>
                </div>

                <div className="article-provenance">
                  <Group gap="xs" c="dimmed">
                    <IconDatabase size={16} stroke={1.7} aria-hidden="true" />
                    <Text size="xs" fw={700}>
                      Archive record
                    </Text>
                  </Group>
                  <Text size="xs" c="dimmed">
                    Fetched {formatDateTime(articleQuery.data.record.fetched_at)}.
                    Copyright remains with the original publisher.
                  </Text>
                </div>
              </>
            )}
          </div>
        </article>
      )}
    </Drawer>
  );
}
