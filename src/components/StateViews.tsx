import { Alert, Button, SimpleGrid, Skeleton, Stack, Text } from '@mantine/core';
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'We could not load this part of the archive',
  message = 'The static data host may be updating. Try again in a moment.',
  onRetry,
}: ErrorStateProps) {
  return (
    <Alert
      icon={<IconAlertCircle size={20} />}
      title={title}
      color="ember"
      variant="light"
      className="state-alert"
    >
      <Stack gap="sm">
        <Text size="sm">{message}</Text>
        {onRetry ? (
          <Button
            variant="light"
            color="ember"
            size="xs"
            leftSection={<IconRefresh size={15} />}
            onClick={onRetry}
            className="state-alert__button"
          >
            Try again
          </Button>
        ) : null}
      </Stack>
    </Alert>
  );
}

export function ArticleGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
      {Array.from({ length: count }, (_, index) => (
        <div className="article-skeleton" key={index}>
          <Skeleton height={12} width="42%" radius="xl" />
          <Skeleton height={28} mt={24} radius="sm" />
          <Skeleton height={28} mt={7} width="82%" radius="sm" />
          <Skeleton height={13} mt={24} radius="xl" />
          <Skeleton height={13} mt={8} width="70%" radius="xl" />
          <Skeleton height={12} mt={30} width="30%" radius="xl" />
        </div>
      ))}
    </SimpleGrid>
  );
}
