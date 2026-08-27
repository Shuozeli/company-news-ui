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
import { Link, useParams } from 'react-router-dom';

import { ArticleGridSkeleton, ErrorState } from '../components/StateViews';
import { useCompanyArticlesV2, useCompanyIndexV2 } from '../hooks/useV2';
import { formatCount, formatDate } from '../lib/format';
import { articleHrefFor, exploreHref } from '../lib/routes';

// v2 company page: the company bucket gives the display name + month list, and
// each infinite "page" is one month of that company's articles (newest first).
export function CompanyPage() {
  const { companyKey = '' } = useParams();
  const indexQuery = useCompanyIndexV2(companyKey);
  const entry = indexQuery.data ?? null;
  const months = entry?.months;

  const pagesQuery = useCompanyArticlesV2(companyKey, months);
  const articles = pagesQuery.data?.pages.flatMap((page) => page) ?? [];

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

        {indexQuery.isPending ? (
          <ArticleGridSkeleton count={4} />
        ) : indexQuery.isError ? (
          <ErrorState onRetry={() => void indexQuery.refetch()} />
        ) : !entry ? (
          <ErrorState
            title="Company not found"
            message="This company is not part of the current snapshot."
          />
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
                {formatCount(entry.article_count)} articles &middot; latest{' '}
                {months && months[0] ? months[0] : '—'}
              </Text>
            </div>

            {pagesQuery.isError ? (
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
