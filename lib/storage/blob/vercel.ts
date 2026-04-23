import type { BlobDriver, BlobMetadata, PutOptions, PutResult } from './types';

// Vercel Blob driver. Stub — fleshed out in Phase 1 once @vercel/blob is
// installed and a token is provisioned. Importing this module throws at
// first use so we don't accidentally ship a half-wired prod driver.

export class VercelBlobDriver implements BlobDriver {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  put(_key: string, _body: Uint8Array | string, _options?: PutOptions): Promise<PutResult> {
    throw new Error('VercelBlobDriver.put: not implemented yet — ship in Phase 1');
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  get(_key: string): Promise<Uint8Array> {
    throw new Error('VercelBlobDriver.get: not implemented yet — ship in Phase 1');
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  head(_key: string): Promise<BlobMetadata | null> {
    throw new Error('VercelBlobDriver.head: not implemented yet — ship in Phase 1');
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  delete(_key: string): Promise<void> {
    throw new Error('VercelBlobDriver.delete: not implemented yet — ship in Phase 1');
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  list(_prefix: string): Promise<BlobMetadata[]> {
    throw new Error('VercelBlobDriver.list: not implemented yet — ship in Phase 1');
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getSignedReadUrl(_key: string, _ttlSeconds?: number): Promise<string> {
    throw new Error('VercelBlobDriver.getSignedReadUrl: not implemented yet — ship in Phase 1');
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getPublicUrl(_key: string): string | null {
    throw new Error('VercelBlobDriver.getPublicUrl: not implemented yet — ship in Phase 1');
  }
}
