import type { BlobDriver } from './types';
import { FsBlobDriver } from './fs';
import { VercelBlobDriver } from './vercel';

// Pick the driver based on env. Lazy-singleton so we only instantiate once
// per server process. On the client, this module MUST NOT be imported —
// all blob operations happen server-side. A top-level Node-only import
// (fs) in FsBlobDriver will fail the client bundle loudly if someone does.

let singleton: BlobDriver | null = null;

export function getBlobDriver(): BlobDriver {
  if (singleton) return singleton;
  const driver = (process.env.BLOB_DRIVER ?? 'fs').toLowerCase();
  switch (driver) {
    case 'fs':
      singleton = new FsBlobDriver();
      return singleton;
    case 'vercel':
      singleton = new VercelBlobDriver();
      return singleton;
    default:
      throw new Error(
        `Unknown BLOB_DRIVER=${driver}. Expected one of: fs, vercel.`,
      );
  }
}

export type { BlobDriver, BlobMetadata, PutOptions, PutResult } from './types';
