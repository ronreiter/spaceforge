import { NextResponse, type NextRequest } from 'next/server';
import { isDevAuth } from './lib/auth';
import { lookupSlugByDomain } from './lib/sites/domains';

// Dev-auth mode is a zero-click bypass: every request is "authenticated"
// as DEV_USER (see lib/auth/dev.ts). Middleware short-circuits so we
// don't touch Clerk at all — useful for local walking-skeleton testing
// without a Clerk account.
//
// Clerk-auth mode wires in @clerk/nextjs' clerkMiddleware; public routes
// (/, /sign-*, /s/*, /api/photo, /api/webhooks/*) are allowed for
// signed-out users, everything else requires auth.
//
// BEFORE auth runs we check the request's Host header: if it's a
// custom-domain pointed at the site, rewrite to /s/<slug>/<path> so
// downstream routing serves the published artifact. DNS + TLS are
// terminated by the platform (Vercel, reverse proxy, etc.) — this
// table only records the mapping, attach the domain on the platform
// separately.

// Hosts we own. Requests on these are never treated as custom domains
// even if someone accidentally adds an entry pointing at them.
const APP_HOSTS = new Set<string>([
  'spaceforge.dev',
  'www.spaceforge.dev',
  'localhost',
  'localhost:3000',
]);

function isAppHost(host: string): boolean {
  if (APP_HOSTS.has(host)) return true;
  if (host.endsWith('.vercel.app')) return true; // preview deployments
  return false;
}

const publicPatterns = [
  /^\/$/,
  /^\/sign-in(\/.*)?$/,
  /^\/sign-up(\/.*)?$/,
  /^\/s\/.*/,
  /^\/api\/photo(\/.*)?$/,
  /^\/api\/forms\/.*/, // public form submission endpoint
  /^\/api\/webhooks\/.*/,
  /^\/_blob\/.*/,
  /^\/_next\/.*/,
  /^\/favicon.*/,
];

function isPublic(pathname: string): boolean {
  return publicPatterns.some((p) => p.test(pathname));
}

export default async function middleware(req: NextRequest) {
  // Host-based custom-domain rewrite. Runs before any auth gating so
  // public sites don't bounce to /sign-in. Only fires for hostnames
  // outside APP_HOSTS — the common case (apex/app host) stays a pure
  // cache-friendly passthrough with no DB read. /api/* paths are
  // skipped so forms and the Unsplash proxy keep working under a
  // custom domain.
  const host = req.headers.get('host')?.toLowerCase() ?? '';
  const path = req.nextUrl.pathname;
  if (
    host &&
    !isAppHost(host) &&
    !path.startsWith('/api/') &&
    !path.startsWith('/_next/')
  ) {
    try {
      const slug = await lookupSlugByDomain(host);
      if (slug) {
        const url = req.nextUrl.clone();
        // Rewrite preserves the original path and query. Root of the
        // custom domain maps to the root of the published site.
        url.pathname = `/s/${slug}${path === '/' ? '' : path}`;
        return NextResponse.rewrite(url);
      }
    } catch (err) {
      // DB unreachable → fall through. Either auth will serve the
      // public landing (if signed in users are browsing a custom
      // domain pointed at the app host wrong) or middleware will 404
      // downstream.
      console.error('[middleware] custom-domain lookup failed', err);
    }
  }

  if (isDevAuth()) {
    // Nothing to gate — dev-auth treats every request as DEV_USER.
    return NextResponse.next();
  }

  // Clerk flow — import lazily so the client build in dev-auth mode
  // doesn't pull in @clerk/nextjs.
  const { clerkMiddleware, createRouteMatcher } = await import('@clerk/nextjs/server');
  const isPublicRoute = createRouteMatcher(
    publicPatterns.map((p) => {
      // Convert our regexes to Clerk's route matcher syntax (glob-ish strings).
      // createRouteMatcher accepts plain strings or regexes; pass the regex
      // directly — it's compatible.
      return p;
    }),
  );
  const handler = clerkMiddleware(async (auth, request) => {
    if (!isPublicRoute(request)) {
      await auth.protect();
    }
  });
  // clerkMiddleware returns a NextMiddleware; invoke it with (req, event).
  // We don't have a NextFetchEvent here, but the middleware accepts
  // undefined for custom call sites.
  return handler(req, {} as never);
}

// Run on the Node.js runtime so `pg`/`drizzle`/`node:crypto` (via the
// custom-domain lookup and Clerk server imports) are usable. On Vercel
// this is backed by Fluid Compute, not the edge runtime.
export const config = {
  runtime: 'nodejs',
  matcher: [
    // Skip Next internals and static files.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)',
    // Always run on API and TRPC routes.
    '/(api|trpc)(.*)',
  ],
};

export { isPublic };
