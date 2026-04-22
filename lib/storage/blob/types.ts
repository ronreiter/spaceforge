// Narrow abstraction over "write bytes at a key, read them back, delete,
// list". Two drivers implement it:
//
//   FsBlobDriver     — writes to .spaceforge-local/blob/ on disk. Local dev.
//   VercelBlobDriver — @vercel/blob. Preview + production.
//
// Selected at runtime by env BLOB_DRIVER=fs|vercel.
//
// Keys look like "drafts/<site-id>/<path>" or "pub/<slug>/<ver>/<path>".
// Drivers MUST treat them as opaque — no slash magic, no URL-encoding, no
// path traversal guards at this layer. Higher-level code (the publish
// pipeline, the draft store) owns key construction.

export type BlobMetadata = {
  key: string;
  size: number;
  contentType: string;
  uploadedAt: Date;
};

export type PutOptions = {
  contentType?: string;
  /** If true, object is publicly readable via getPublicUrl(). Otherwise
   *  reads require a signed URL via getSignedReadUrl(). */
  public?: boolean;
};

export type PutResult = {
  key: string;
  size: number;
  /** Null for private objects; set for public objects on drivers that
   *  support it (Vercel Blob public, or our local /_blob/ serving). */
  publicUrl: string | null;
};

export interface BlobDriver {
  /** Write bytes at `key`. If the key exists, overwrite. */
  put(key: string, body: Uint8Array | string, options?: PutOptions): Promise<PutResult>;

  /** Read bytes at `key`. Throws if missing. */
  get(key: string): Promise<Uint8Array>;

  /** Return metadata only (no bytes). Returns null if missing. */
  head(key: string): Promise<BlobMetadata | null>;

  /** Remove `key`. No-op if missing. */
  delete(key: string): Promise<void>;

  /** List keys with the given prefix, most-recent first. */
  list(prefix: string): Promise<BlobMetadata[]>;

  /** Short-lived, authenticated read URL. Used for private drafts. */
  getSignedReadUrl(key: string, ttlSeconds?: number): Promise<string>;

  /** Permanent public URL. Returns null if the object isn't public. */
  getPublicUrl(key: string): string | null;
}
