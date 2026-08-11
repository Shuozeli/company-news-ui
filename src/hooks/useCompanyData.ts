import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { dataClient } from '../data/client';
import type { ArticleSummary, CompanyDirectoryEntry } from '../data/types';
import { bucketNameForCompanyKey } from '../lib/routes';

// Resolve a company_key to its directory entry (which carries the
// company_manifest_path, display name, and counts) starting only from the URL.
// This is what makes #/c/:companyKey a cold-loadable deep link: directory
// manifest -> bucket for the key's first char -> the entry.
export function useCompanyEntry(
  companyKey: string | undefined,
  directoryManifestPath: string | undefined,
  generation: string | undefined,
): UseQueryResult<CompanyDirectoryEntry> {
  return useQuery({
    queryKey: ['company-entry', generation, companyKey],
    enabled: Boolean(companyKey && directoryManifestPath && generation),
    staleTime: 60_000,
    queryFn: async ({ signal }): Promise<CompanyDirectoryEntry> => {
      if (!companyKey || !directoryManifestPath || !generation) {
        throw new Error('Missing company lookup inputs');
      }
      const directory = await dataClient.getCompanyDirectory(
        directoryManifestPath,
        generation,
        signal,
      );
      const bucketName = bucketNameForCompanyKey(companyKey);
      const descriptor = directory.buckets.find(
        (bucket) => bucket.bucket === bucketName,
      );
      if (!descriptor) {
        throw new Error(`No company directory bucket for "${companyKey}"`);
      }
      const bucket = await dataClient.getCompanyBucket(
        descriptor.path,
        generation,
        signal,
      );
      const entry = bucket.companies.find(
        (company) => company.company_key === companyKey,
      );
      if (!entry) {
        throw new Error(`Company "${companyKey}" is not in this snapshot`);
      }
      return entry;
    },
  });
}

// Cold-load resolution for an article: walk the company's paged article index
// until the document_id is found, returning its full ArticleSummary (which
// carries record_path + article_path for getArticle). Used only when the
// ArticleSummary was not handed over via router navigation state.
export async function resolveArticleSummary(
  companyManifestPath: string,
  documentId: string,
  generation: string,
  signal?: AbortSignal,
): Promise<ArticleSummary> {
  const manifest = await dataClient.getCompanyManifest(
    companyManifestPath,
    generation,
    signal,
  );
  const pages = manifest.article_index?.pages ?? [];
  for (const descriptor of pages) {
    const page = await dataClient.getBrowsePage(
      descriptor.path,
      generation,
      signal,
    );
    const found = page.items.find((item) => item.document_id === documentId);
    if (found) return found;
  }
  throw new Error(`Article "${documentId}" was not found for this company`);
}
