// Versioned, portable shard selector for the time-partitioned archive (v2).
// MUST compute identically to the Rust impl in
// company-feed-server/crates/feed-exporter/src/selector.rs. Agreement is pinned
// by selector-testvectors.json (asserted in selector.test.ts). See
// company-feed-server/docs/design/2026-08-26-time-partitioned-archive.md.
//
// Algorithm:
//   h    = SHA-256( saltBytes || 0x00 || keyBytes )
//   top  = big-endian u32 of h[0..4]
//   bucket = top % bucketCount

export interface ShardScheme {
  bucket_count: number;
  salt: string;
}

const enc = new TextEncoder();

/** The bucket for `key` under (salt, bucketCount). Async: uses Web Crypto. */
export async function selector(
  key: string,
  salt: string,
  bucketCount: number,
): Promise<number> {
  if (!Number.isInteger(bucketCount) || bucketCount <= 0) {
    throw new Error('bucketCount must be a positive integer');
  }
  const saltBytes = enc.encode(salt);
  const keyBytes = enc.encode(key);
  const buf = new Uint8Array(saltBytes.length + 1 + keyBytes.length);
  buf.set(saltBytes, 0);
  buf[saltBytes.length] = 0;
  buf.set(keyBytes, saltBytes.length + 1);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', buf));
  // big-endian u32 of the first 4 bytes, kept unsigned
  const top =
    ((digest[0] << 24) >>> 0) +
    (digest[1] << 16) +
    (digest[2] << 8) +
    digest[3];
  return (top >>> 0) % bucketCount;
}

/** The bucket for `key` under a resolved scheme. */
export function bucketFor(scheme: ShardScheme, key: string): Promise<number> {
  return selector(key, scheme.salt, scheme.bucket_count);
}
