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
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';

import { ArticleCard } from '../components/ArticleCard';
import { CategoryGrid } from '../components/CategoryGrid';
import { ArticleGridSkeleton, ErrorState } from '../components/StateViews';
import { dataClient } from '../data/client';
import type { ArticleSummary } from '../data/types';
import { useIndex } from '../hooks/useIndex';
import { formatCount, formatDateTime } from '../lib/format';
import { articleHrefFor, exploreHref, latestHref } from '../lib/routes';

const HOME_CATEGORY_LIMIT = 6;
const HOME_LATEST_LIMIT = 6;

export function HomePage() {
  const navigate = useNavigate();
  const indexQuery = useIndex();
  const index = indexQuery.data;
  const generation = index?.generation;
  const categoryManifestPath = index?.paths.category_directory_manifest;
  const taxonomyGeneration = index?.taxonomy_generation;

  const openArticle = (article: ArticleSummary) => {
    navigate(articleHrefFor(article), { state: { article } });
  };

  const directoryQuery = useQuery({
    queryKey: ['category-directory', generation, taxonomyGeneration],
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

  const recentManifestQuery = useQuery({
    queryKey: ['recent-manifest', generation],
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

  const firstRecentPath = recentManifestQuery.data?.pages[0]?.path;
  const recentPageQuery = useQuery({
    queryKey: ['recent-page-first', generation],
    enabled: Boolean(index && firstRecentPath),
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: ({ signal }) => {
      if (!index || !firstRecentPath) throw new Error('Recent page unavailable');
      return dataClient.getBrowsePage(firstRecentPath, index.generation, signal);
    },
  });

  const latest = recentPageQuery.data?.items.slice(0, HOME_LATEST_LIMIT) ?? [];
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
                {indexQuery.isPending ? (
                  <Stack gap="md" mt="md">
                    <Skeleton height={46} />
                    <Skeleton height={46} />
                    <Skeleton height={13} width="75%" />
                  </Stack>
                ) : index ? (
                  <>
                    <div className="snapshot-card__stats">
                      <SnapshotStat
                        icon={<IconNews size={20} />}
                        value={formatCount(index.record_count)}
                        label="articles"
                      />
                      <SnapshotStat
                        icon={<IconBuilding size={20} />}
                        value={formatCount(index.company_count)}
                        label="companies"
                      />
                    </div>
                    <Group gap={7} mt="md" className="snapshot-card__generated">
                      <IconDatabase size={15} stroke={1.7} />
                      <Text size="xs">
                        Generated {formatDateTime(index.generated_at)}
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

            {indexQuery.isError ? (
              <ErrorState onRetry={() => void indexQuery.refetch()} />
            ) : !categoryManifestPath || !taxonomyGeneration ? (
              <ErrorState
                title="This snapshot does not include the category tree"
                message="Publish company-news-data with the taxonomy-aware exporter, then refresh this reader."
              />
            ) : directoryQuery.isPending ? (
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

            {recentManifestQuery.isError ? (
              <ErrorState onRetry={() => void recentManifestQuery.refetch()} />
            ) : recentPageQuery.isError ? (
              <ErrorState onRetry={() => void recentPageQuery.refetch()} />
            ) : recentManifestQuery.isPending || recentPageQuery.isPending ? (
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
