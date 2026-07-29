import type { CompanyDirectoryEntry } from '../data/types';

const DEMO_COMPANY_KEYS = ['apple', 'amd', 'adobe-inc-common-stock'];

export function chooseDefaultCompany(
  companies: readonly CompanyDirectoryEntry[],
): CompanyDirectoryEntry | null {
  for (const companyKey of DEMO_COMPANY_KEYS) {
    const preferred = companies.find(
      (company) => company.company_key === companyKey,
    );
    if (preferred) return preferred;
  }

  return (
    [...companies].sort(
      (left, right) =>
        right.record_count - left.record_count ||
        left.company_name.localeCompare(right.company_name),
    )[0] ?? null
  );
}

export function shouldLoadNextCompanyPage({
  requestedCompanyKey,
  companyFound,
  hasNextPage,
  isFetchingNextPage,
}: {
  requestedCompanyKey: string | null;
  companyFound: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}): boolean {
  return Boolean(
    requestedCompanyKey &&
      !companyFound &&
      hasNextPage &&
      !isFetchingNextPage,
  );
}
