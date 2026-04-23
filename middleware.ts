import { NextResponse, type NextRequest } from 'next/server';
import { isDevAuth } from './lib/auth';

// Dev-auth mode is a zero-click bypass: every request is "authenticated"
// as DEV_USER (see lib/auth/dev.ts). Middleware short-circuits so we
// don't touch Clerk at all — useful for local walking-skeleton testing
// without a Clerk account.
//
// Clerk-auth mode wires in @clerk/nextjs' clerkMiddleware; public routes
// (/, /sign-*, /s/*, /api/photo, /api/webhooks/*) are allowed for
// signed-out users, everything else requires auth.

const publicPatterns = [
  /^\/$/,
  /^\/sign-in(\/.*)?$/,
  /^\/sign-up(\/.*)?$/,
  /^\/s\/.*/,
  /^\/api\/photo(\/.*)?$/,
  /^\/api\/webhooks\/.*/,
  /^\/_blob\/.*/,
  /^\/_next\/.*/,
  /^\/favicon.*/,
];

function isPublic(pathname: string): boolean {
  return publicPatterns.some((p) => p.test(pathname));
}

export default async function middleware(req: NextRequest) {
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

export const config = {
  matcher: [
    // Skip Next internals and static files.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)',
    // Always run on API and TRPC routes.
    '/(api|trpc)(.*)',
  ],
};

export { isPublic };
