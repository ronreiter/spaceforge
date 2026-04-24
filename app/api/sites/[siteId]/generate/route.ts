import type { NextRequest } from 'next/server';
import { requireUser } from '../../../../../lib/auth';
import {
  getSiteAccess,
  roleAtLeast,
  updateSite,
} from '../../../../../lib/sites/service';
import { getTemplate } from '../../../../../src/templates/registry';
import { runGenerationLoop } from '../../../../../lib/generate/loop';
import { gatewayModelCalls } from '../../../../../lib/generate/model';
import type { LoopEvent } from '../../../../../lib/generate/types';

// Server-side agent generation. Takes a natural-language site description,
// runs plan → write-one-file → critic-review until the critic says complete
// (or we hit the step cap). Progress is streamed as SSE so the editor can
// render each step in real time.
//
// Request:  POST /api/sites/:id/generate   body: { prompt: string }
// Response: text/event-stream — one event per LoopEvent, see lib/generate/types.ts

export const runtime = 'nodejs';
// Fluid Compute ceiling on this project is 300s; the loop will almost always
// finish faster, but set the route-level preferredRegion tight to avoid
// cold-start spikes on the Gateway call.
export const maxDuration = 300;

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ siteId: string }> },
) {
  const user = await requireUser();
  const { siteId } = await ctx.params;
  const access = await getSiteAccess(user, siteId);
  if (!access) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (!roleAtLeast(access.role, 'editor')) {
    return new Response(JSON.stringify({ error: 'Read-only access.' }), {
      status: 403,
      headers: { 'content-type': 'application/json' },
    });
  }

  const body = (await req.json().catch(() => ({}))) as { prompt?: unknown };
  if (typeof body.prompt !== 'string' || !body.prompt.trim()) {
    return new Response(
      JSON.stringify({ error: 'Missing { prompt: string } in body.' }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    );
  }
  const prompt = body.prompt.trim();

  // SSE encoding: each LoopEvent becomes one "event:" + "data:" pair. No
  // reconnection ids; the stream ends on `done` or `error` and the client
  // re-POSTs if the user asks to try again.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: LoopEvent) => {
        const payload = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };
      try {
        await runGenerationLoop({
          siteId,
          userPrompt: prompt,
          models: gatewayModelCalls({
            plannerModel: process.env.AGENT_PLANNER_MODEL,
            executorModel: process.env.AGENT_EXECUTOR_MODEL,
            criticModel: process.env.AGENT_CRITIC_MODEL,
          }),
          applyTemplate: async (templateId) => {
            // Only apply a template the registry knows about — silently
            // fall through to the site's existing templateId ("custom" by
            // default) if the planner invents one.
            if (!getTemplate(templateId)) return;
            await updateSite(user, siteId, { templateId });
          },
          onEvent: send,
          signal: req.signal,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        send({ type: 'error', message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    },
  });
}
