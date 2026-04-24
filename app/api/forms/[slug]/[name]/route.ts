import { NextResponse, type NextRequest } from 'next/server';
import { recordSubmission } from '../../../../../lib/sites/forms';

// Public form submission endpoint. Accepts either multipart/form-data,
// application/x-www-form-urlencoded, or application/json. Responds
// with a 303 redirect back to the Referer (with ?submitted=<name>) for
// plain <form> POSTs, or 201 JSON for fetch() callers.
//
// No auth. No CSRF gate — published sites are static and the form
// action is on the same origin (or a custom domain proxied here), so
// browser same-origin semantics apply. Rate limiting / spam gates are
// follow-up work.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_FIELDS = 50;
const MAX_FIELD_BYTES = 10_000;

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max);
}

async function parseBody(req: NextRequest): Promise<Record<string, unknown>> {
  const ct = req.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    const obj = (await req.json()) as Record<string, unknown>;
    return obj ?? {};
  }
  // Covers multipart/form-data and x-www-form-urlencoded. Files are
  // stored as their filename string — we don't blob-up uploads yet.
  const form = await req.formData();
  const out: Record<string, unknown> = {};
  let count = 0;
  for (const [key, value] of form.entries()) {
    if (count++ >= MAX_FIELDS) break;
    if (typeof value === 'string') {
      out[key] = truncate(value, MAX_FIELD_BYTES);
    } else if (value && typeof value === 'object' && 'name' in value) {
      out[key] = `[file: ${String((value as File).name)}]`;
    }
  }
  return out;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string; name: string }> },
) {
  const { slug, name } = await ctx.params;
  const data = await parseBody(req).catch(() => ({}) as Record<string, unknown>);

  const submission = await recordSubmission({
    slug,
    formName: name,
    data,
    userAgent: req.headers.get('user-agent'),
    ip:
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip'),
  });

  // Unknown slug or soft-deleted → 404 for fetch callers; browser
  // form posts get a 303 back to the referer with ?error so the user
  // doesn't stare at a raw JSON body.
  if (!submission) {
    if (req.headers.get('accept')?.includes('application/json')) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }
    const ref = req.headers.get('referer') ?? '/';
    return NextResponse.redirect(
      new URL(`${ref}${ref.includes('?') ? '&' : '?'}form_error=not_found`),
      { status: 303 },
    );
  }

  if (req.headers.get('accept')?.includes('application/json')) {
    return NextResponse.json({ ok: true, id: submission.id }, { status: 201 });
  }
  const ref = req.headers.get('referer') ?? '/';
  const redirect = new URL(ref);
  redirect.searchParams.set('submitted', name);
  return NextResponse.redirect(redirect, { status: 303 });
}
