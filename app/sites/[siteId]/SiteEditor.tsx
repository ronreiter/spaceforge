'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Anchor,
  Badge,
  Box,
  Button,
  Group,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconEye,
  IconRocket,
  IconRocketOff,
} from '@tabler/icons-react';

// The existing src/App.tsx editor. Pulls in transformers.js, Monaco,
// TipTap, and other client-only bundles — load without SSR so the
// server build never touches them.
const App = dynamic(() => import('../../../src/App'), {
  ssr: false,
});

type PublishState = {
  publishedAt: string | null;
  publishing: boolean;
  error: string | null;
};

export function SiteEditor({
  siteId,
  siteName,
  siteSlug,
  role,
  initialPublishedAt,
}: {
  siteId: string;
  siteName: string;
  siteSlug: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  initialPublishedAt: string | null;
}) {
  const [state, setState] = useState<PublishState>({
    publishedAt: initialPublishedAt,
    publishing: false,
    error: null,
  });

  const canWrite = role === 'owner' || role === 'admin' || role === 'editor';

  async function publish() {
    setState((s) => ({ ...s, publishing: true, error: null }));
    const res = await fetch(`/api/sites/${siteId}/publish`, { method: 'POST' });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setState((s) => ({
        ...s,
        publishing: false,
        error: body?.error ?? `HTTP ${res.status}`,
      }));
      return;
    }
    const body = (await res.json()) as { result: { publishedAt: string } };
    setState({ publishedAt: body.result.publishedAt, publishing: false, error: null });
  }

  async function unpublish() {
    if (!confirm('Take this site offline? Visitors will see 404 until you republish.')) return;
    setState((s) => ({ ...s, publishing: true, error: null }));
    const res = await fetch(`/api/sites/${siteId}/publish`, { method: 'DELETE' });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setState((s) => ({
        ...s,
        publishing: false,
        error: body?.error ?? `HTTP ${res.status}`,
      }));
      return;
    }
    setState({ publishedAt: null, publishing: false, error: null });
  }

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Box
        px="md"
        py={6}
        style={{
          borderBottom: '1px solid var(--mantine-color-default-border)',
          background: 'var(--mantine-color-body)',
        }}
      >
        <Group gap="sm" wrap="nowrap">
          <Tooltip label="Back to dashboard">
            <Anchor component={Link} href="/dashboard" c="dimmed">
              <Group gap={4}>
                <IconArrowLeft size={14} />
                <Text size="xs">Dashboard</Text>
              </Group>
            </Anchor>
          </Tooltip>
          <Text fw={600} size="sm">
            {siteName}
          </Text>
          <Text size="xs" c="dimmed" ff="monospace">
            /s/{siteSlug}
          </Text>
          {state.publishedAt ? (
            <Badge size="xs" color="green">
              published
            </Badge>
          ) : (
            <Badge size="xs" color="gray">
              draft
            </Badge>
          )}
          {!canWrite && (
            <Badge size="xs" color="blue">
              read-only ({role})
            </Badge>
          )}
          <Box style={{ flex: 1 }} />
          {state.error && (
            <Text c="red" size="xs">
              {state.error}
            </Text>
          )}
          {state.publishedAt && (
            <Tooltip label="Open published site">
              <Anchor
                href={`/s/${siteSlug}/`}
                target="_blank"
                rel="noopener"
                size="xs"
              >
                <Group gap={4}>
                  <IconEye size={14} />
                  <Text size="xs">View</Text>
                </Group>
              </Anchor>
            </Tooltip>
          )}
          {canWrite && (
            <>
              {state.publishedAt ? (
                <Button
                  variant="light"
                  color="red"
                  size="xs"
                  leftSection={<IconRocketOff size={14} />}
                  onClick={unpublish}
                  loading={state.publishing}
                >
                  Unpublish
                </Button>
              ) : null}
              <Button
                size="xs"
                leftSection={<IconRocket size={14} />}
                onClick={publish}
                loading={state.publishing}
              >
                {state.publishedAt ? 'Republish' : 'Publish'}
              </Button>
            </>
          )}
        </Group>
      </Box>
      <Box style={{ flex: 1, minHeight: 0 }}>
        <App siteId={siteId} />
      </Box>
    </Box>
  );
}
