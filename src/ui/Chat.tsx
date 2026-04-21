import { useState, useEffect, useRef } from 'react';
import {
  Stack,
  Paper,
  Text,
  Textarea,
  Button,
  ScrollArea,
  Group,
  Badge,
  Loader,
  Box,
} from '@mantine/core';
import {
  IconSend,
  IconHourglassHigh,
  IconBolt,
  IconSparkles,
} from '@tabler/icons-react';
import type { ChatMessage } from '../storage/files';

export type ChatSendState = 'idle' | 'queued' | 'generating' | 'loading-model';

export type ChatProps = {
  messages: ChatMessage[];
  sendState: ChatSendState;
  statusLine?: string;
  tokensPerSecond?: number;
  queuedPrompt?: string | null;
  onSend: (text: string) => void;
  onClearQueue: () => void;
};

const SUGGESTIONS = [
  'A one-page portfolio for a landscape photographer named Ana, with an About page.',
  'A minimalist blog with three posts about urban cycling.',
  'A product landing page for a smart plant pot called Sprout.',
  'A three-page site for a local bakery — home, menu, contact.',
];

export function Chat({
  messages,
  sendState,
  statusLine,
  tokensPerSecond,
  queuedPrompt,
  onSend,
  onClearQueue,
}: ChatProps) {
  const [input, setInput] = useState('');
  const viewport = useRef<HTMLDivElement>(null);

  useEffect(() => {
    viewport.current?.scrollTo({ top: viewport.current.scrollHeight });
  }, [messages, statusLine, queuedPrompt]);

  function submit() {
    const text = input.trim();
    if (!text) return;
    if (sendState === 'generating') return; // block while generating; queue only while loading
    onSend(text);
    setInput('');
  }

  const visible = messages.filter((m) => m.role !== 'system');
  const buttonLabel =
    sendState === 'loading-model'
      ? 'Send (queues until ready)'
      : sendState === 'queued'
      ? 'Send (queues until ready)'
      : sendState === 'generating'
      ? 'Generating…'
      : 'Send  (⌘⏎)';

  const buttonIcon =
    sendState === 'generating' ? (
      <Loader size={14} color="white" />
    ) : sendState === 'loading-model' || sendState === 'queued' ? (
      <IconHourglassHigh size={14} />
    ) : (
      <IconSend size={14} />
    );

  return (
    <Stack h="100%" gap={0}>
      <ScrollArea viewportRef={viewport} style={{ flex: 1 }} type="auto">
        <Stack p="sm" gap="xs">
          {visible.length === 0 && (
            <Stack gap="xs">
              <Group gap={6} mb={4}>
                <IconSparkles size={14} color="var(--mantine-color-neon-3)" />
                <Text size="sm" c="dimmed">
                  Describe the site you want. Spaceforge writes HTML/CSS/JS in your browser.
                </Text>
              </Group>
              {SUGGESTIONS.map((s) => (
                <Paper
                  key={s}
                  withBorder
                  p="xs"
                  radius="sm"
                  onClick={() => sendState !== 'generating' && onSend(s)}
                  style={{
                    cursor: sendState === 'generating' ? 'not-allowed' : 'pointer',
                    opacity: sendState === 'generating' ? 0.5 : 1,
                  }}
                >
                  <Text size="xs">{s}</Text>
                </Paper>
              ))}
            </Stack>
          )}
          {visible.map((m, i) => (
            <Paper
              key={i}
              p="xs"
              radius="md"
              withBorder={m.role === 'assistant'}
              bg={m.role === 'user' ? 'neon.3' : undefined}
              c={m.role === 'user' ? 'dark.9' : undefined}
              maw="90%"
              style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start' }}
            >
              <Text
                size="sm"
                style={{
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.55,
                  color: 'inherit',
                }}
              >
                {m.content || <span style={{ opacity: 0.5 }}>…</span>}
              </Text>
            </Paper>
          ))}
          {queuedPrompt && (
            <Paper p="xs" radius="md" withBorder style={{ alignSelf: 'flex-end', maxWidth: '90%' }}>
              <Group justify="space-between" gap="xs" wrap="nowrap">
                <Group gap={6} wrap="nowrap">
                  <IconHourglassHigh size={14} />
                  <Text size="xs" c="dimmed">
                    Queued — runs once model is ready
                  </Text>
                </Group>
                <Text
                  size="xs"
                  style={{ cursor: 'pointer', textDecoration: 'underline' }}
                  c="dimmed"
                  onClick={onClearQueue}
                >
                  cancel
                </Text>
              </Group>
              <Text size="sm" mt={4} style={{ whiteSpace: 'pre-wrap' }}>
                {queuedPrompt}
              </Text>
            </Paper>
          )}
          {statusLine && (
            <Group gap={6}>
              <IconBolt size={12} color="var(--mantine-color-dimmed)" />
              <Text size="xs" c="dimmed" fs="italic">
                {statusLine}
                {tokensPerSecond && tokensPerSecond > 0
                  ? ` · ${tokensPerSecond.toFixed(1)} tok/s`
                  : ''}
              </Text>
            </Group>
          )}
        </Stack>
      </ScrollArea>

      <Box
        p="sm"
        style={{
          borderTop: '1px solid var(--mantine-color-default-border)',
        }}
      >
        {sendState === 'loading-model' && !queuedPrompt && (
          <Badge
            size="xs"
            color="blue"
            variant="light"
            leftSection={<IconHourglassHigh size={10} />}
            mb={6}
          >
            Model loading — you can type and send; I'll run it as soon as the model is ready
          </Badge>
        )}
        <Textarea
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
          placeholder="Message Spaceforge…"
          autosize
          minRows={3}
          maxRows={8}
          disabled={sendState === 'generating'}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
        />
        <Button
          onClick={submit}
          disabled={sendState === 'generating' || !input.trim()}
          fullWidth
          mt="xs"
          size="sm"
          leftSection={buttonIcon}
          color={
            sendState === 'loading-model' || sendState === 'queued' ? 'blue' : undefined
          }
        >
          {buttonLabel}
        </Button>
      </Box>
    </Stack>
  );
}
