import { eq } from 'drizzle-orm';
import { db, schema } from '../../db/client';
import { getBlobDriver } from '../storage/blob';
import { isMarkdown, renderMarkdownPage } from '../../src/runtime/markdownRender';
import {
  isTemplate,
  isPageTemplate,
  outputPath,
  renderTemplate,
} from '../../src/runtime/nunjucksRender';
import { overlayFiles, CUSTOM_TEMPLATE_ID } from '../../src/templates/registry';
import { injectFrameworkServer } from './injectFramework';
import type { AuthedUser } from '../auth/types';
import { getSiteAccess, roleAtLeast } from '../sites/service';

// Compiles a site's draft into an immutable public artifact set under
// pub/<slug>/<version-id>/<path>. Reuses the exact same render
// functions the browser preview + zip export already use so what you
// see in the editor is what ships.
//
// Flow:
//  1) Permission check (editor or above).
//  2) Load manifest from site_files; fetch each draft blob's content.
//  3) Apply the template overlay (styles.css etc. from the active
//     template shadow any generated file of the same path).
//  4) Render .md → .html via renderMarkdownPage, .njk → .html via
//     renderTemplate, skip partials (_*), copy raw assets as-is.
//  5) Inject framework styles (Pico, fonts, icons) into every HTML file.
//  6) Upload each rendered artifact to pub/<slug>/<version-id>/<out>.
//  7) Insert site_versions row; atomic UPDATE to sites
//     .published_version_id. Old versions stay live at their own paths
//     so rollback is instantaneous.

export type PublishResult = {
  versionId: string;
  publishedAt: string;
  artifacts: Array<{ outputPath: string; blobKey: string; size: number }>;
};

export class PublishError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PublishError';
  }
}

function isPartial(path: string): boolean {
  const base = path.split('/').pop() ?? path;
  return base.startsWith('_');
}

function contentTypeForPath(path: string): string {
  if (path.endsWith('.html') || path.endsWith('.htm'))
    return 'text/html; charset=utf-8';
  if (path.endsWith('.css')) return 'text/css; charset=utf-8';
  if (path.endsWith('.js') || path.endsWith('.mjs'))
    return 'application/javascript; charset=utf-8';
  if (path.endsWith('.json')) return 'application/json; charset=utf-8';
  if (path.endsWith('.txt')) return 'text/plain; charset=utf-8';
  if (path.endsWith('.svg')) return 'image/svg+xml';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  if (path.endsWith('.gif')) return 'image/gif';
  if (path.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}

// Load the current draft as a Record<path, content> — the shape the
// existing renderers expect.
async function loadDraftFiles(
  siteId: string,
): Promise<Record<string, string>> {
  const rows = await db
    .select()
    .from(schema.siteFiles)
    .where(eq(schema.siteFiles.siteId, siteId));
  const blob = getBlobDriver();
  const out: Record<string, string> = {};
  for (const row of rows) {
    const bytes = await blob.get(row.blobKey);
    out[row.path] = new TextDecoder('utf-8').decode(bytes);
  }
  return out;
}

export async function publishSite(
  user: AuthedUser,
  siteId: string,
): Promise<PublishResult> {
  const access = await getSiteAccess(user, siteId);
  if (!access) throw new PublishError('Site not found.');
  if (!roleAtLeast(access.role, 'editor')) {
    throw new PublishError('Read-only access — cannot publish.');
  }

  const draft = await loadDraftFiles(siteId);
  const overlay = overlayFiles(draft, access.site.templateId || CUSTOM_TEMPLATE_ID);

  // Create the version row first so we have an id to namespace the
  // uploads. publishedAt is set now; we update it again at the end only
  // if the upload loop succeeds (cosmetic).
  const [version] = await db
    .insert(schema.siteVersions)
    .values({
      siteId,
      authorId: user.id,
      manifest: [],
    })
    .returning();

  const slug = access.site.slug;
  const blob = getBlobDriver();
  const artifacts: Array<{ outputPath: string; blobKey: string; size: number }> = [];

  for (const [path, content] of Object.entries(overlay)) {
    try {
      // Markdown → HTML via layout → inject framework → upload as .html
      if (isMarkdown(path)) {
        if (isPartial(path)) continue;
        const rendered = injectFrameworkServer(
          renderMarkdownPage(path, overlay, { slug, name: access.site.name }),
          slug,
        );
        const out = outputPath(path);
        const key = `pub/${slug}/${version.id}/${out}`;
        const res = await blob.put(key, rendered, {
          contentType: 'text/html; charset=utf-8',
          public: true,
        });
        artifacts.push({ outputPath: out, blobKey: key, size: res.size });
        continue;
      }

      // Nunjucks page templates → HTML; partials skipped. Layouts are
      // not standalone pages either (they're referenced by .md front
      // matter), so isPageTemplate handles that.
      if (isTemplate(path)) {
        if (!isPageTemplate(path)) continue;
        const rendered = injectFrameworkServer(
          renderTemplate(path, overlay, {
            site: { slug, name: access.site.name },
          }),
          slug,
        );
        const out = outputPath(path);
        const key = `pub/${slug}/${version.id}/${out}`;
        const res = await blob.put(key, rendered, {
          contentType: 'text/html; charset=utf-8',
          public: true,
        });
        artifacts.push({ outputPath: out, blobKey: key, size: res.size });
        continue;
      }

      // Raw .html pages emitted by the model — still inject framework so
      // they stand alone in the published tree.
      if (path.toLowerCase().endsWith('.html')) {
        const rendered = injectFrameworkServer(content, slug);
        const key = `pub/${slug}/${version.id}/${path}`;
        const res = await blob.put(key, rendered, {
          contentType: 'text/html; charset=utf-8',
          public: true,
        });
        artifacts.push({ outputPath: path, blobKey: key, size: res.size });
        continue;
      }

      // Static assets — ship as-is.
      const key = `pub/${slug}/${version.id}/${path}`;
      const res = await blob.put(key, content, {
        contentType: contentTypeForPath(path),
        public: true,
      });
      artifacts.push({ outputPath: path, blobKey: key, size: res.size });
    } catch (err) {
      // A single failing file shouldn't nuke the whole publish; emit an
      // error page under that path so the site doesn't 404 for it.
      const message = err instanceof Error ? err.message : String(err);
      const fallback = `<!doctype html><pre>Render error in ${path}:\n${message}</pre>`;
      const out = isMarkdown(path) || isTemplate(path) ? outputPath(path) : path;
      const key = `pub/${slug}/${version.id}/${out}`;
      const res = await blob.put(key, fallback, {
        contentType: 'text/html; charset=utf-8',
        public: true,
      });
      artifacts.push({ outputPath: out, blobKey: key, size: res.size });
    }
  }

  // Write the manifest and pivot the site to this version.
  const publishedAt = new Date();
  await db
    .update(schema.siteVersions)
    .set({ manifest: artifacts, publishedAt })
    .where(eq(schema.siteVersions.id, version.id));
  await db
    .update(schema.sites)
    .set({ publishedVersionId: version.id, publishedAt })
    .where(eq(schema.sites.id, siteId));

  return {
    versionId: version.id,
    publishedAt: publishedAt.toISOString(),
    artifacts,
  };
}

export async function unpublishSite(user: AuthedUser, siteId: string): Promise<void> {
  const access = await getSiteAccess(user, siteId);
  if (!access) throw new PublishError('Site not found.');
  if (!roleAtLeast(access.role, 'editor')) {
    throw new PublishError('Read-only access — cannot unpublish.');
  }
  await db
    .update(schema.sites)
    .set({ publishedVersionId: null, publishedAt: null })
    .where(eq(schema.sites.id, siteId));
}
