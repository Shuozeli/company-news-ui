import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { dataClient } from '../data/client';
import type { DataIndex } from '../data/types';

// Shared index.json query. Every page needs the current generation (used as the
// data-fetch cache key) and the manifest paths, so it lives in one hook with a
// stable query key and is served from the react-query cache after the first load.
export function useIndex(): UseQueryResult<DataIndex> {
  return useQuery({
    queryKey: ['data-index'],
    queryFn: ({ signal }) => dataClient.getIndex(signal),
    staleTime: 60_000,
    retry: 2,
  });
}
