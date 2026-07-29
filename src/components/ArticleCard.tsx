import { Badge, Group, Text, Title } from '@mantine/core';
import { IconArrowUpRight, IconClock } from '@tabler/icons-react';

import type { ArticleSummary } from '../data/types';
import { formatDate } from '../lib/format';

interface ArticleCardProps {
  article: ArticleSummary;
  onOpen: (article: ArticleSummary) => void;
}

export function ArticleCard({ article, onOpen }: ArticleCardProps) {
  const timestamp = article.published_at ?? article.fetched_at;

  return (
    <button
      type="button"
      className="article-card"
      onClick={() => onOpen(article)}
      aria-label={`Read ${article.title}`}
    >
      <div className="article-card__topline">
        <Text component="span" className="article-card__company">
          {article.company_name}
        </Text>
        <Badge
          variant="light"
          color="harbor"
          size="sm"
          className="article-card__source"
        >
          {article.source_kind}
        </Badge>
      </div>

      <Title order={3} className="article-card__title">
        {article.title}
      </Title>

      <Text className="article-card__summary">
        {article.summary || 'Open the article to read the full company update.'}
      </Text>

      <Group justify="space-between" className="article-card__footer">
        <Group gap={7}>
          <IconClock size={15} stroke={1.7} aria-hidden="true" />
          <Text component="span" size="sm">
            {formatDate(timestamp)}
          </Text>
        </Group>
        <IconArrowUpRight
          className="article-card__arrow"
          size={19}
          stroke={1.7}
          aria-hidden="true"
        />
      </Group>
    </button>
  );
}
