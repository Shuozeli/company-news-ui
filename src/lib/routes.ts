import type { ArticleSummary } from '../data/types';

export function exploreHref(): string {
  return '/explore';
}

export function categoryHref(categoryKey: string): string {
  return `/explore/${encodeURIComponent(categoryKey)}`;
}

export function companyHref(companyKey: string): string {
  return `/c/${encodeURIComponent(companyKey)}`;
}

export function articleHref(companyKey: string, documentId: string): string {
  return `/c/${encodeURIComponent(companyKey)}/${encodeURIComponent(documentId)}`;
}

export function articleHrefFor(article: ArticleSummary): string {
  return articleHref(article.company_key, article.document_id);
}

export function latestHref(): string {
  return '/latest';
}

// The company directory is bucketed by the first character of the company_key:
// digits collapse to "0-9", ASCII letters map to that letter, everything else
// falls into "other" (verified against the live datayuacx26 archive manifest).
export function bucketNameForCompanyKey(companyKey: string): string {
  const first = companyKey.trim()[0]?.toLowerCase() ?? '';
  if (first >= '0' && first <= '9') return '0-9';
  if (first >= 'a' && first <= 'z') return first;
  return 'other';
}
