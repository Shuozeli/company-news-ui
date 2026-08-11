import { Button, Container, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import { exploreHref } from '../lib/routes';

export function NotFoundPage() {
  return (
    <Container size="md" className="content-shell">
      <Stack gap="md" align="center" py={60}>
        <Title order={2}>Page not found</Title>
        <Text c="dimmed" ta="center" maw={420}>
          That route is not part of this reader. Head back to the archive to
          browse categories, companies, and articles.
        </Text>
        <Button
          component={Link}
          to={exploreHref()}
          color="harbor"
          radius="xl"
          leftSection={<IconArrowLeft size={16} />}
        >
          Back to explore
        </Button>
      </Stack>
    </Container>
  );
}
