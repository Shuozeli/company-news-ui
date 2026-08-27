import {
  Anchor,
  Badge,
  Button,
  Container,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  IconArrowRight,
  IconBrandGithub,
  IconBuilding,
  IconDatabase,
  IconNews,
  IconSitemap,
} from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router-dom';

import { ArticleCard } from '../components/ArticleCard';
import { CategoryGrid } from '../components/CategoryGrid';
import { ArticleGridSkeleton, ErrorState } from '../components/StateViews';
import type { ArticleSummary } from '../data/types';
import {
  useCategoryDirectoryV2,
  useConfigV2,
  useRecentArticlesV2,
} from '../hooks/useV2';
import { formatCount } from '../lib/format';
import { articleHrefFor, exploreHref, latestHref } from '../lib/routes';

const HOME_CATEGORY_LIMIT = 6;
const HOME_LATEST_LIMIT = 6;

export function HomePage() {
  const navigate = useNavigate();

  // Everything on the home page now comes from the v2 reader: snapshot counts
  // + recent feed + the category teaser grid.
  const configV2Query = useConfigV2();
  const configV2 = configV2Query.data;
  const recentQuery = useRecentArticlesV2(HOME_LATEST_LIMIT);
  const directoryQuery = useCategoryDirectoryV2();

  const openArticle = (article: ArticleSummary) => {
    navigate(articleHrefFor(article));
  };

  const latest = recentQuery.data ?? [];
  const categories = directoryQuery.data?.categories ?? [];

  return (
    <>
      <section className="hero">
        <Container size="xl">
          <div className="hero__grid">
            <div className="hero__copy">
              <Badge variant="outline" color="ember" radius="xl">
                Company news sources, one branch at a time
              </Badge>
              <Title order={1}>
                An open-source, company-first news aggregation stack.
              </Title>
              <Text className="hero__description">
                The pipeline discovers and reviews company newsrooms, blogs,
                press pages, and engineering sources, then publishes a versioned
                static archive. This reader requests only the category, company,
                and article branch you explore.
              </Text>
              <Group className="hero__actions" gap="sm">
                <Button
                  component={Link}
                  to={exploreHref()}
                  color="harbor"
                  radius="xl"
                  leftSection={<IconSitemap size={17} />}
                >
                  Explore the tree
                </Button>
                <Button
                  component={Link}
                  to={latestHref()}
                  variant="outline"
                  color="dark"
                  radius="xl"
                  leftSection={<IconNews size={17} />}
                >
                  Latest updates
                </Button>
                <Button
                  component="a"
                  href="https://github.com/Shuozeli/company-news-ui"
                  target="_blank"
                  rel="noreferrer"
                  variant="subtle"
                  color="dark"
                  radius="xl"
                  leftSection={<IconBrandGithub size={17} />}
                >
                  View source
                </Button>
              </Group>
            </div>

            <div className="hero__side">
              <div className="snapshot-card">
                <Text className="eyebrow">Current data snapshot</Text>
                {configV2Query.isPending ? (
                  <Stack gap="md" mt="md">
                    <Skeleton height={46} />
                    <Skeleton height={46} />
                    <Skeleton height={13} width="75%" />
                  </Stack>
                ) : configV2 ? (
                  <>
                    <div className="snapshot-card__stats">
                      <SnapshotStat
                        icon={<IconNews size={20} />}
                        value={formatCount(configV2.record_count)}
                        label="articles"
                      />
                      <SnapshotStat
                        icon={<IconBuilding size={20} />}
                        value={formatCount(configV2.company_count)}
                        label="companies"
                      />
                    </div>
                    <Group gap={7} mt="md" className="snapshot-card__generated">
                      <IconDatabase size={15} stroke={1.7} />
                      <Text size="xs">
                        Snapshot {configV2.generation.slice(0, 12)}
                      </Text>
                    </Group>
                  </>
                ) : (
                  <Text className="snapshot-card__generated" size="sm" mt="md">
                    Snapshot metadata is temporarily unavailable.
                  </Text>
                )}
              </div>

              <div className="pipeline-strip" aria-label="System architecture">
                <PipelineStage
                  icon={<IconSitemap size={17} />}
                  title="Pipeline"
                  detail="Discover + crawl"
                />
                <PipelineStage
                  icon={<IconDatabase size={17} />}
                  title="Versioned data"
                  detail="JSON + Markdown"
                />
                <PipelineStage
                  icon={<IconNews size={17} />}
                  title="Static reader"
                  detail="Load one branch"
                />
              </div>
            </div>
          </div>
        </Container>
      </section>

      <Container size="xl" className="content-shell">
        <Stack gap={56}>
          <Stack gap="lg">
            <Group justify="space-between" align="end" className="section-heading">
              <div>
                <Text className="eyebrow">Explore the tree</Text>
                <Title order={2}>Browse by category</Title>
              </div>
              <Anchor component={Link} to={exploreHref()} fw={650}>
                All categories <IconArrowRight size={15} />
              </Anchor>
            </Group>

            {directoryQuery.isPending ? (
              <ArticleGridSkeleton count={6} />
            ) : directoryQuery.isError ? (
              <ErrorState onRetry={() => void directoryQuery.refetch()} />
            ) : (
              <CategoryGrid categories={categories} limit={HOME_CATEGORY_LIMIT} />
            )}
          </Stack>

          <Stack gap="lg">
            <Group justify="space-between" align="end" className="section-heading">
              <div>
                <Text className="eyebrow">Latest from the source</Text>
                <Title order={2}>Recent company updates</Title>
              </div>
              <Anchor component={Link} to={latestHref()} fw={650}>
                All latest <IconArrowRight size={15} />
              </Anchor>
            </Group>

            {recentQuery.isError ? (
              <ErrorState onRetry={() => void recentQuery.refetch()} />
            ) : recentQuery.isPending ? (
              <ArticleGridSkeleton />
            ) : latest.length === 0 ? (
              <div className="empty-state">
                <Text fw={650}>No articles have been published yet.</Text>
              </div>
            ) : (
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                {latest.map((article) => (
                  <ArticleCard
                    key={article.document_id}
                    article={article}
                    onOpen={openArticle}
                  />
                ))}
              </SimpleGrid>
            )}
          </Stack>
        </Stack>
      </Container>
    </>
  );
}

function PipelineStage({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div className="pipeline-stage">
      <span className="pipeline-stage__icon" aria-hidden="true">
        {icon}
      </span>
      <span>
        <Text component="span" className="pipeline-stage__title">
          {title}
        </Text>
        <Text component="span" className="pipeline-stage__detail">
          {detail}
        </Text>
      </span>
    </div>
  );
}

function SnapshotStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="snapshot-stat">
      <span className="snapshot-stat__icon">{icon}</span>
      <span>
        <Text component="span" className="snapshot-stat__value">
          {value}
        </Text>
        <Text component="span" className="snapshot-stat__label">
          {label}
        </Text>
      </span>
    </div>
  );
}
