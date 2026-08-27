import { Group, SimpleGrid } from '@mantine/core';
import { IconArrowRight, IconFolder } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import { formatCompactCount } from '../lib/format';
import { categoryHref } from '../lib/routes';

// Minimal shape the grid renders. Both the v1 CategoryDescriptor and the v2
// CategoryV2 are structurally assignable to this, so the grid is source-agnostic.
export interface CategoryCard {
  key: string;
  name: string;
  company_count: number;
  record_count: number;
}

interface CategoryGridProps {
  categories: CategoryCard[];
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
