import type { NextRequest } from 'next/server';
import { requireUser } from '../../../../../lib/auth';
import {
  deleteNotification,
  listNotifications,
  upsertNotification,
} from '../../../../../lib/sites/formNotify';
import { errorResponse, json } from '../../../../../lib/api/respond';

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ siteId: string }> },
) {
  try {
    const user = await requireUser();
    const { siteId } = await ctx.params;
    const settings = await listNotifications(user, siteId);
    return json({ settings });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ siteId: string }> },
) {
  try {
    const user = await requireUser();
    const { siteId } = await ctx.params;
    const body = (await req.json()) as {
      formName?: unknown;
      email?: unknown;
      webhookUrl?: unknown;
    };
    const setting = await upsertNotification(user, siteId, {
      formName: typeof body.formName === 'string' ? body.formName : '',
      email: typeof body.email === 'string' ? body.email : null,
      webhookUrl: typeof body.webhookUrl === 'string' ? body.webhookUrl : null,
    });
    return json({ setting });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ siteId: string }> },
) {
  try {
    const user = await requireUser();
    const { siteId } = await ctx.params;
    const url = new URL(req.url);
    const formName = url.searchParams.get('formName') ?? '';
    await deleteNotification(user, siteId, formName);
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
