import { describe, expect, it } from 'vitest';

import type { CompanyDirectoryEntry } from '../data/types';
import {
  chooseDefaultCompany,
  shouldLoadNextCompanyPage,
} from './companySelection';

function company(
  company_key: string,
  record_count: number,
): CompanyDirectoryEntry {
  return {
    company_key,
    company_name: company_key,
    record_count,
    first_published_at: null,
    last_published_at: null,
    company_manifest_path: `articles/${company_key}/company.json`,
  };
}

describe('company explorer selection', () => {
  it('uses a recognizable company for the initial Technology demo', () => {
    expect(
      chooseDefaultCompany([
        company('high-volume-company', 900),
        company('apple', 55),
      ])?.company_key,
    ).toBe('apple');
  });

  it('falls back to the company with the largest loaded archive', () => {
    expect(
      chooseDefaultCompany([
        company('smaller', 10),
        company('larger', 40),
      ])?.company_key,
    ).toBe('larger');
    expect(chooseDefaultCompany([])).toBeNull();
  });

  it('continues paging only while an unresolved deep link can be found', () => {
    expect(
      shouldLoadNextCompanyPage({
        requestedCompanyKey: 'microsoft',
        companyFound: false,
        hasNextPage: true,
        isFetchingNextPage: false,
      }),
    ).toBe(true);
    expect(
      shouldLoadNextCompanyPage({
        requestedCompanyKey: 'microsoft',
        companyFound: true,
        hasNextPage: true,
        isFetchingNextPage: false,
      }),
    ).toBe(false);
    expect(
      shouldLoadNextCompanyPage({
        requestedCompanyKey: null,
        companyFound: false,
        hasNextPage: true,
        isFetchingNextPage: false,
      }),
    ).toBe(false);
  });
});
