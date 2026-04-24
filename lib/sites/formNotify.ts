import { eq } from 'drizzle-orm';
import { db, schema } from '../../db/client';
import type { AuthedUser } from '../auth/types';
import {
  getSiteAccess,
  roleAtLeast,
  ValidationError,
} from './service';

// Outgoing notification side-channels for form submissions. Two
// transports:
//   - email: Resend HTTP API, skipped when RESEND_API_KEY is unset
//   - webhook: plain POST, JSON body, 5s timeout
//
// dispatchNotifications runs asynchronously from recordSubmission and
// never throws — a bad webhook or a Resend outage cannot interfere
// with the public form-submission 303 redirect.

export type FormNotificationRow = {
  formName: string;
  email: string | null;
  webhookUrl: string | null;
  updatedAt: Date;
};

export async function listNotifications(
  user: AuthedUser,
  siteId: string,
): Promise<FormNotificationRow[]> {
  const access = await getSiteAccess(user, siteId);
  if (!access) throw new ValidationError('Site not found.');
  const rows = await db
    .select()
    .from(schema.formNotifications)
    .where(eq(schema.formNotifications.siteId, siteId));
  return rows.map((r) => ({
    formName: r.formName,
    email: r.email,
    webhookUrl: r.webhookUrl,
    updatedAt: r.updatedAt,
  }));
}

export async function upsertNotification(
  user: AuthedUser,
  siteId: string,
  input: { formName: string; email?: string | null; webhookUrl?: string | null },
): Promise<FormNotificationRow> {
  const access = await getSiteAccess(user, siteId);
  if (!access) throw new ValidationError('Site not found.');
  if (!roleAtLeast(access.role, 'editor')) {
    throw new ValidationError('Read-only access.');
  }
  const formName = (input.formName ?? '').trim().slice(0, 120);
  const email = input.email ? input.email.trim() : null;
  const webhookUrl = input.webhookUrl ? input.webhookUrl.trim() : null;

  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new ValidationError('Not a valid email address.');
  }
  if (webhookUrl && !/^https?:\/\/.+/.test(webhookUrl)) {
    throw new ValidationError('Webhook URL must start with http(s)://');
  }

  await db
    .insert(schema.formNotifications)
    .values({
      siteId,
      formName,
      email,
      webhookUrl,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [schema.formNotifications.siteId, schema.formNotifications.formName],
      set: { email, webhookUrl, updatedAt: new Date() },
    });

  return { formName, email, webhookUrl, updatedAt: new Date() };
}

export async function deleteNotification(
  user: AuthedUser,
  siteId: string,
  formName: string,
): Promise<void> {
  const access = await getSiteAccess(user, siteId);
  if (!access) throw new ValidationError('Site not found.');
  if (!roleAtLeast(access.role, 'editor')) {
    throw new ValidationError('Read-only access.');
  }
  const { and: andOp, eq: eqOp } = await import('drizzle-orm');
  await db
    .delete(schema.formNotifications)
    .where(
      andOp(
        eqOp(schema.formNotifications.siteId, siteId),
        eqOp(schema.formNotifications.formName, formName),
      ),
    );
}

// Matching rules used by the submission handler to find which rows
// apply to a given incoming submission. Both the exact formName and
// the wildcard '' row (if present) fire together so a user can set a
// site-wide email + a per-form webhook.
export async function dispatchNotifications(input: {
  siteId: string;
  siteName: string;
  siteSlug: string;
  formName: string;
  data: Record<string, unknown>;
  submissionId: number;
  createdAt: Date;
}): Promise<void> {
  try {
    const rows = await db
      .select()
      .from(schema.formNotifications)
      .where(eq(schema.formNotifications.siteId, input.siteId));
    const applicable = rows.filter(
      (r) => r.formName === '' || r.formName === input.formName,
    );
    if (applicable.length === 0) return;

    await Promise.all(
      applicable.flatMap((r) => {
        const jobs: Promise<unknown>[] = [];
        if (r.email) jobs.push(sendEmail(r.email, input).catch((e) => console.error('[forms] email failed', e)));
        if (r.webhookUrl) jobs.push(sendWebhook(r.webhookUrl, input).catch((e) => console.error('[forms] webhook failed', e)));
        return jobs;
      }),
    );
  } catch (err) {
    // Database lookup failed — log + give up. The submission itself
    // has already landed; notifications are best-effort.
    console.error('[forms] dispatchNotifications failed', err);
  }
}

async function sendEmail(
  to: string,
  input: {
    siteName: string;
    siteSlug: string;
    formName: string;
    data: Record<string, unknown>;
    submissionId: number;
    createdAt: Date;
  },
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return; // Resend not configured — silent no-op

  const fromAddr = process.env.RESEND_FROM ?? 'forms@spaceforge.dev';
  const subject = `[${input.siteName}] new ${input.formName || 'form'} submission`;
  const rows = Object.entries(input.data)
    .map(
      ([k, v]) =>
        `<tr><td style="color:#64748b;padding:4px 8px 4px 0;vertical-align:top">${escapeHtml(k)}</td><td style="padding:4px 0">${escapeHtml(typeof v === 'string' ? v : JSON.stringify(v))}</td></tr>`,
    )
    .join('');
  const html = `<!doctype html>
<html><body style="font-family:system-ui,sans-serif;color:#0f172a">
<h2 style="margin:0 0 8px">New submission on ${escapeHtml(input.siteName)}</h2>
<p style="color:#64748b;margin:0 0 16px">Form "<b>${escapeHtml(input.formName)}</b>" · submission #${input.submissionId}</p>
<table style="border-collapse:collapse">${rows}</table>
<p style="margin-top:16px;color:#64748b;font-size:12px">Via Spaceforge · /s/${escapeHtml(input.siteSlug)}</p>
</body></html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddr,
      to,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend HTTP ${res.status}: ${body}`);
  }
}

async function sendWebhook(
  url: string,
  input: {
    siteName: string;
    siteSlug: string;
    formName: string;
    data: Record<string, unknown>;
    submissionId: number;
    createdAt: Date;
  },
): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        siteName: input.siteName,
        siteSlug: input.siteSlug,
        formName: input.formName,
        submissionId: input.submissionId,
        createdAt: input.createdAt.toISOString(),
        data: input.data,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Webhook ${url} returned HTTP ${res.status}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
