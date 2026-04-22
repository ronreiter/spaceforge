import { NextResponse } from 'next/server';
import { AuthError } from '../auth';
import { ValidationError } from '../sites/service';

// Centralized error-to-response mapping so every route renders the same
// JSON shape for 400/401/403/404/500.

export function json(body: unknown, init?: ResponseInit): NextResponse {
  return NextResponse.json(body, init);
}

export function errorResponse(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
  if (err instanceof ValidationError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  const message = err instanceof Error ? err.message : String(err);
  // Log server-side for observability; don't leak stack traces to clients.
  console.error('[api] unhandled', err);
  return NextResponse.json({ error: message }, { status: 500 });
}
