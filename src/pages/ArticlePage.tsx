import {
  Anchor,
  Badge,
  Breadcrumbs,
  Button,
  Container,
  Divider,
  Group,
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
import ReactMarkdown from 'react-markdown';
import { Link, useParams } from 'react-router-dom';
import remarkGfm from 'remark-gfm';

import { ArticleGridSkeleton, ErrorState } from '../components/StateViews';
import { stripArchiveFrontmatter } from '../data/client';
import { useArticleV2 } from '../hooks/useV2';
import { formatDate, formatDateTime } from '../lib/format';
import { companyHref, exploreHref } from '../lib/routes';

// v2 permalink: the doc_id alone resolves the article via its hash bucket, so a
// single fetch yields both the metadata and the Markdown body (they live in one
// immutable data file). No company-directory / manifest walk is needed anymore.
export function ArticlePage() {
  const { companyKey = '', documentId = '' } = useParams();
  const articleQuery = useArticleV2(documentId);
  const article = articleQuery.data ?? null;

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

        {articleQuery.isPending ? (
          <ArticleGridSkeleton count={2} />
        ) : articleQuery.isError || !article ? (
          <ErrorState
            title="Article not found"
            message="This article is not in the current snapshot. It may have been superseded by a newer generation."
            onRetry={() => void articleQuery.refetch()}
          />
        ) : (
          <article>
            <Button
              component={Link}
              to={companyHref(article.company_key)}
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
                    {formatDate(article.published_at ?? article.first_seen_at)}
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
                  {stripArchiveFrontmatter(article.body_markdown)}
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
                  First seen {formatDateTime(article.first_seen_at)}. Copyright
                  remains with the original publisher.
                </Text>
              </div>
            </div>
          </article>
        )}
      </Stack>
    </Container>
  );
}
