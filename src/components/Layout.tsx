import { Badge, Button, Container, Group, Text } from '@mantine/core';
import { IconArrowUpRight, IconBrandGithub, IconNews } from '@tabler/icons-react';
import { Link, Outlet } from 'react-router-dom';

import { useIndex } from '../hooks/useIndex';
import { shortenGeneration } from '../lib/format';
import { ScrollToTop } from './ScrollToTop';

// Shared chrome for every route: header (brand + snapshot badge + source link),
// the routed page via <Outlet/>, and the footer. Page-level scroll lives on the
// document, not on any pinned-height child.
export function Layout() {
  const indexQuery = useIndex();

  return (
    <div className="app">
      <ScrollToTop />
      <header className="site-header">
        <Container size="xl" className="site-header__inner">
          <Link to="/" className="brand" aria-label="Company News home">
            <span className="brand__mark" aria-hidden="true">
              <IconNews size={23} stroke={1.7} />
            </span>
            <span>
              <span className="brand__name">Company News</span>
              <span className="brand__byline">a company-first reader</span>
            </span>
          </Link>

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
              href="https://github.com/Shuozeli/company-news-ui"
              target="_blank"
              rel="noreferrer"
              variant="subtle"
              color="dark"
              size="sm"
              leftSection={<IconBrandGithub size={18} />}
            >
              <span className="desktop-label">View source</span>
              <span className="mobile-label">Source</span>
            </Button>
          </Group>
        </Container>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="site-footer">
        <Container size="xl" className="site-footer__inner">
          <div>
            <Text fw={700}>Company News</Text>
            <Text size="sm" className="footer-note">
              Source code is MIT licensed. Archived articles remain subject to
              their publishers&rsquo; rights.
            </Text>
          </div>
          <Group gap="lg">
            <a
              href="https://github.com/Shuozeli/company-news-ui"
              target="_blank"
              rel="noreferrer"
            >
              Reader <IconArrowUpRight size={14} />
            </a>
            <a
              href="https://github.com/datayuacx26/company-news-data"
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
    </div>
  );
}
