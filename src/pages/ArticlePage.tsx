import {
  Anchor,
  Badge,
  Breadcrumbs,
  Button,
  Container,
  Divider,
  Group,
  Loader,
  Skeleton,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconArrowUpRight,
  IconCalendar,
  IconDatabase,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { Link, useLocation, useParams } from 'react-router-dom';
import remarkGfm from 'remark-gfm';

import { ArticleGridSkeleton, ErrorState } from '../components/StateViews';
import { dataClient, stripArchiveFrontmatter } from '../data/client';
import type { ArticleSummary } from '../data/types';
import { resolveArticleSummary, useCompanyEntry } from '../hooks/useCompanyData';
import { useIndex } from '../hooks/useIndex';
import { formatDate, formatDateTime } from '../lib/format';
import { companyHref, exploreHref } from '../lib/routes';

export function ArticlePage() {
  const { companyKey = '', documentId = '' } = useParams();
  const location = useLocation();
  const passedArticle =
    (location.state as { article?: ArticleSummary } | null)?.article ?? null;
  const needsResolve = !passedArticle;

  const indexQuery = useIndex();
  const index = indexQuery.data;
  const generation = index?.generation;
  const directoryManifestPath = index?.paths.company_directory_manifest;

  // Only resolve the company + article ref from scratch on a cold (shared-link)
  // load. When arriving from a list, the ArticleSummary rides in router state.
  const entryQuery = useCompanyEntry(
    needsResolve ? companyKey : undefined,
    directoryManifestPath,
    generation,
  );
  const entry = entryQuery.data;

  const summaryQuery = useQuery({
    queryKey: ['article-summary', generation, companyKey, documentId],
    enabled: Boolean(needsResolve && entry && generation && documentId),
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: ({ signal }) => {
      if (!entry || !generation) throw new Error('Missing article lookup inputs');
      return resolveArticleSummary(
        entry.company_manifest_path,
        documentId,
        generation,
        signal,
      );
    },
  });

  const article = passedArticle ?? summaryQuery.data ?? null;

  const articleQuery = useQuery({
    queryKey: ['article', generation, article?.document_id],
    enabled: Boolean(article && generation),
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: ({ signal }) => {
      if (!article || !generation) throw new Error('No article to load');
      return dataClient.getArticle(
        article.record_path,
        article.article_path,
        generation,
        signal,
      );
    },
  });

  const resolving =
    needsResolve &&
    (indexQuery.isPending ||
      entryQuery.isPending ||
      summaryQuery.isPending ||
      (summaryQuery.isFetching && !summaryQuery.data));

  const crumbs = (
    <Breadcrumbs separator="/">
      <Anchor component={Link} to={exploreHref()} size="sm">
        Explore
      </Anchor>
      <Anchor component={Link} to={companyHref(companyKey)} size="sm">
        {article?.company_name ?? companyKey}
      </Anchor>
      <Text size="sm" c="dimmed">
        Article
      </Text>
    </Breadcrumbs>
  );

  return (
    <Container size="md" className="content-shell">
      <Stack gap="lg">
        {crumbs}

        {indexQuery.isError ? (
          <ErrorState onRetry={() => void indexQuery.refetch()} />
        ) : entryQuery.isError ? (
          <ErrorState
            title="Company not found"
            message="This article's company is not part of the current snapshot."
          />
        ) : summaryQuery.isError ? (
          <ErrorState
            title="Article not found"
            message="This article is not in the current snapshot. It may have been superseded by a newer generation."
          />
        ) : resolving || !article ? (
          <ArticleGridSkeleton count={2} />
        ) : (
          <article>
            <Button
              component={Link}
              to={companyHref(companyKey)}
              variant="subtle"
              color="dark"
              size="sm"
              leftSection={<IconArrowLeft size={16} />}
              className="article-back"
            >
              All {article.company_name} articles
            </Button>

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

            <Divider my="md" />

            <div className="article-reader__content">
              {articleQuery.isPending ? (
                <Stack gap="md">
                  <Group gap="sm">
                    <Loader size="sm" color="harbor" />
                    <Text c="dimmed" size="sm">
                      Loading this article&rsquo;s record and Markdown&hellip;
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
      </Stack>
    </Container>
  );
}
