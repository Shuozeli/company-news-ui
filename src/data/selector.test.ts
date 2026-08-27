import { describe, expect, it } from 'vitest';

import { selector } from './selector';
import vectors from './selector-testvectors.json';

describe('shard selector (Rust<->JS contract)', () => {
  it('reproduces every canonical test vector from the Rust exporter', async () => {
    for (const v of vectors.vectors as Array<{
      salt: string;
      bucket_count: number;
      key: string;
      bucket: number;
    }>) {
      const got = await selector(v.key, v.salt, v.bucket_count);
      expect(got, `${v.salt} / ${v.bucket_count} / "${v.key}"`).toBe(v.bucket);
    }
  });
});
