import { Group, SimpleGrid } from '@mantine/core';
import { IconArrowRight, IconFolder } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import type { CategoryDescriptor } from '../data/types';
import { formatCompactCount } from '../lib/format';
import { categoryHref } from '../lib/routes';

interface CategoryGridProps {
  categories: CategoryDescriptor[];
  limit?: number;
}

// Shared category-card grid used by both the landing page (a teaser) and the
// full Explore page. Keeps the card markup and href logic in one place.
export function CategoryGrid({ categories, limit }: CategoryGridProps) {
  const shown = typeof limit === 'number' ? categories.slice(0, limit) : categories;

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
      {shown.map((category) => (
        <Link
          key={category.key}
          to={categoryHref(category.key)}
          className="browse-card"
        >
          <Group justify="space-between" align="start" wrap="nowrap">
            <span className="browse-card__icon" aria-hidden="true">
              <IconFolder size={20} stroke={1.7} />
            </span>
            <IconArrowRight
              className="browse-card__arrow"
              size={18}
              stroke={1.8}
              aria-hidden="true"
            />
          </Group>
          <span className="browse-card__title">{category.name}</span>
          <span className="browse-card__meta">
            {formatCompactCount(category.company_count)} companies &middot;{' '}
            {formatCompactCount(category.record_count)} articles
          </span>
        </Link>
      ))}
    </SimpleGrid>
  );
}
