import {
  Badge,
  Button,
  Container,
  Group,
  Skeleton,
  Stack,
  Tabs,
  Text,
  Title,
} from '@mantine/core';
import {
  IconArrowUpRight,
  IconBrandGithub,
  IconBuilding,
  IconDatabase,
  IconNews,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { lazy, Suspense, useState } from 'react';

import { LatestFeed } from './components/LatestFeed';
import { ErrorState } from './components/StateViews';
import { dataClient } from './data/client';
import type { ArticleSummary } from './data/types';
import {
  formatCount,
  formatDateTime,
  shortenGeneration,
} from './lib/format';

type AppView = 'latest' | 'companies';

const CompanyExplorer = lazy(() =>
  import('./components/CompanyExplorer').then((module) => ({
    default: module.CompanyExplorer,
  })),
);
const ArticleDrawer = lazy(() =>
  import('./components/ArticleDrawer').then((module) => ({
    default: module.ArticleDrawer,
  })),
);

function initialView(): AppView {
  const view = new URLSearchParams(window.location.search).get('view');
  return view === 'companies' ? 'companies' : 'latest';
}

export default function App() {
  const [view, setView] = useState<AppView>(initialView);
  const [selectedArticle, setSelectedArticle] =
    useState<ArticleSummary | null>(null);

  const indexQuery = useQuery({
    queryKey: ['data-index'],
    queryFn: ({ signal }) => dataClient.getIndex(signal),
    staleTime: 60_000,
    retry: 2,
  });

  const changeView = (nextView: string | null) => {
    if (nextView !== 'latest' && nextView !== 'companies') return;
    setView(nextView);
    const url = new URL(window.location.href);
    if (nextView === 'latest') url.searchParams.delete('view');
    else url.searchParams.set('view', nextView);
    window.history.replaceState(null, '', url);
  };

  return (
    <div className="app">
      <header className="site-header">
        <Container size="xl" className="site-header__inner">
          <a href="/" className="brand" aria-label="Company News home">
            <span className="brand__mark" aria-hidden="true">
              <IconNews size={23} stroke={1.7} />
            </span>
            <span>
              <span className="brand__name">Company News</span>
              <span className="brand__byline">an open data reader</span>
            </span>
          </a>

          <Group gap="sm">
            {indexQuery.data ? (
              <Badge
                visibleFrom="sm"
                variant="light"
                color="harbor"
                className="snapshot-badge"
              >
                snapshot {shortenGeneration(indexQuery.data.generation)}
              </Badge>
            ) : null}
            <Button
              component="a"
              href="https://github.com/Shuozeli/company-news-data"
              target="_blank"
              rel="noreferrer"
              variant="subtle"
              color="dark"
              size="sm"
              leftSection={<IconBrandGithub size={18} />}
            >
              <span className="desktop-label">View data</span>
              <span className="mobile-label">Data</span>
            </Button>
          </Group>
        </Container>
      </header>

      <main>
        <section className="hero">
          <Container size="xl">
            <div className="hero__grid">
              <div className="hero__copy">
                <Badge variant="outline" color="ember" radius="xl">
                  Versioned · static · open
                </Badge>
                <Title order={1}>
                  Company updates,
                  <br />
                  minus the firehose.
                </Title>
                <Text className="hero__description">
                  Explore engineering posts, product news, and company
                  announcements from a version-controlled archive. The reader
                  requests only the slice you choose.
                </Text>
              </div>

              <div className="snapshot-card">
                <Text className="eyebrow">Current data snapshot</Text>
                {indexQuery.isPending ? (
                  <Stack gap="md" mt="md">
                    <Skeleton height={46} />
                    <Skeleton height={46} />
                    <Skeleton height={13} width="75%" />
                  </Stack>
                ) : indexQuery.data ? (
                  <>
                    <div className="snapshot-card__stats">
                      <SnapshotStat
                        icon={<IconNews size={20} />}
                        value={formatCount(indexQuery.data.record_count)}
                        label="articles"
                      />
                      <SnapshotStat
                        icon={<IconBuilding size={20} />}
                        value={formatCount(indexQuery.data.company_count)}
                        label="companies"
                      />
                    </div>
                    <Group gap={7} mt="lg" c="dimmed">
                      <IconDatabase size={15} stroke={1.7} />
                      <Text size="xs">
                        Generated {formatDateTime(indexQuery.data.generated_at)}
                      </Text>
                    </Group>
                  </>
                ) : (
                  <Text c="dimmed" size="sm" mt="md">
                    Snapshot metadata is temporarily unavailable.
                  </Text>
                )}
              </div>
            </div>
          </Container>
        </section>

        <Container size="xl" className="content-shell">
          {indexQuery.isError ? (
            <ErrorState
              title="The data index is unavailable"
              message="The reader starts with company-news-data/index.json. It could not be fetched, so no larger data files were requested."
              onRetry={() => void indexQuery.refetch()}
            />
          ) : indexQuery.isPending ? (
            <div className="app-loading">
              <Skeleton height={48} radius="xl" />
              <Skeleton height={360} mt="xl" />
            </div>
          ) : (
            <Tabs value={view} onChange={changeView} keepMounted={false}>
              <div className="view-nav">
                <Tabs.List>
                  <Tabs.Tab value="latest" leftSection={<IconNews size={17} />}>
                    Latest
                  </Tabs.Tab>
                  <Tabs.Tab
                    value="companies"
                    leftSection={<IconBuilding size={17} />}
                  >
                    Companies
                  </Tabs.Tab>
                </Tabs.List>
                <Text size="xs" c="dimmed" visibleFrom="sm">
                  No database or application server required
                </Text>
              </div>

              <Tabs.Panel value="latest" pt="xl">
                <LatestFeed
                  index={indexQuery.data}
                  onOpenArticle={setSelectedArticle}
                />
              </Tabs.Panel>
              <Tabs.Panel value="companies" pt="xl">
                <Suspense
                  fallback={
                    <div className="app-loading">
                      <Skeleton height={360} />
                    </div>
                  }
                >
                  <CompanyExplorer
                    index={indexQuery.data}
                    onOpenArticle={setSelectedArticle}
                  />
                </Suspense>
              </Tabs.Panel>
            </Tabs>
          )}
        </Container>
      </main>

      <footer className="site-footer">
        <Container size="xl" className="site-footer__inner">
          <div>
            <Text fw={700}>Company News</Text>
            <Text size="sm" c="dimmed">
              A browser for open, version-controlled company news data.
            </Text>
          </div>
          <Group gap="lg">
            <a
              href="https://github.com/Shuozeli/company-news-data"
              target="_blank"
              rel="noreferrer"
            >
              Data <IconArrowUpRight size={14} />
            </a>
            <a
              href="https://github.com/Shuozeli/company-feed-server"
              target="_blank"
              rel="noreferrer"
            >
              Pipeline <IconArrowUpRight size={14} />
            </a>
          </Group>
        </Container>
      </footer>

      {selectedArticle && indexQuery.data ? (
        <Suspense fallback={null}>
          <ArticleDrawer
            article={selectedArticle}
            generation={indexQuery.data.generation}
            onClose={() => setSelectedArticle(null)}
          />
        </Suspense>
      ) : null}
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
