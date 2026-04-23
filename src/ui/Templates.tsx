import { useMemo } from 'react';
import {
  SimpleGrid,
  Card,
  Group,
  Text,
  Badge,
  Button,
  ScrollArea,
  Box,
  Stack,
  UnstyledButton,
} from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { TEMPLATES, CUSTOM_TEMPLATE_ID, type TemplateBundle } from '../templates/registry';
import { renderTemplatePreviewHtml } from '../templates/previewSample';

export type TemplatesProps = {
  templateId: string;
  onSelect: (id: string) => void;
  readOnly?: boolean;
};

export function Templates({ templateId, onSelect, readOnly }: TemplatesProps) {
  return (
    <ScrollArea h="100%" p="md">
      <Stack gap="md">
        <Box>
          <Text fw={600} size="lg">
            Template
          </Text>
          <Text c="dimmed" size="sm">
            Choose how the site looks. Templates own the stylesheet only — the
            model's generated layout, header, and footer stay in place.
            Selecting a template swaps <code>styles.css</code>; switching back
            to Custom restores the generated stylesheet.
          </Text>
          {readOnly && (
            <Text c="dimmed" size="xs" mt="xs" fs="italic">
              You're viewing this site as a viewer. Template changes are disabled.
            </Text>
          )}
        </Box>

        <SimpleGrid cols={{ base: 1, xs: 2, md: 3, xl: 4 }} spacing="md">
          {TEMPLATES.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              active={t.id === templateId}
              onSelect={readOnly ? () => {} : onSelect}
              disabled={readOnly}
            />
          ))}
        </SimpleGrid>
      </Stack>
    </ScrollArea>
  );
}

function TemplateCard({
  template,
  active,
  onSelect,
  disabled,
}: {
  template: TemplateBundle;
  active: boolean;
  onSelect: (id: string) => void;
  disabled?: boolean;
}) {
  const isCustom = template.id === CUSTOM_TEMPLATE_ID;
  const previewHtml = useMemo(() => renderTemplatePreviewHtml(template), [template]);

  return (
    <Card
      withBorder
      p={0}
      style={{
        borderColor: active ? 'var(--mantine-color-neon-5)' : undefined,
        borderWidth: active ? 2 : 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <UnstyledButton
        onClick={() => onSelect(template.id)}
        disabled={active || disabled}
      >
        <TemplatePreview html={previewHtml} />
      </UnstyledButton>

      <Stack gap={6} p="md" style={{ flex: 1 }}>
        <Group gap="xs" wrap="wrap">
          <Text fw={600}>{template.name}</Text>
          {active && (
            <Badge
              size="sm"
              color="neon"
              leftSection={<IconCheck size={10} />}
              variant="light"
            >
              In use
            </Badge>
          )}
          {isCustom && (
            <Badge size="sm" color="gray" variant="light">
              Default
            </Badge>
          )}
        </Group>
        <Text c="dimmed" size="sm" style={{ flex: 1 }}>
          {template.description}
        </Text>
        <Button
          size="xs"
          variant={active ? 'light' : 'filled'}
          color="neon"
          disabled={active || disabled}
          onClick={() => onSelect(template.id)}
          fullWidth
        >
          {active ? 'Selected' : 'Use this template'}
        </Button>
      </Stack>
    </Card>
  );
}

const PREVIEW_SCALE = 0.28;

// The card thumbnail: a sandboxed iframe rendered at 1/PREVIEW_SCALE of its
// container size and then CSS-scaled down. This makes the preview look like
// a zoomed-out desktop page at any card width. The iframe is pointer-events:
// none so clicks fall through to the card's UnstyledButton wrapper.
function TemplatePreview({ html }: { html: string }) {
  const inverse = 1 / PREVIEW_SCALE;
  return (
    <Box
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '4 / 3',
        background: '#ffffff',
        borderBottom: '1px solid var(--mantine-color-default-border)',
        overflow: 'hidden',
      }}
    >
      <iframe
        srcDoc={html}
        sandbox="allow-same-origin"
        aria-hidden="true"
        title="Template preview"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: `${inverse * 100}%`,
          height: `${inverse * 100}%`,
          border: 0,
          transform: `scale(${PREVIEW_SCALE})`,
          transformOrigin: 'top left',
          pointerEvents: 'none',
        }}
      />
    </Box>
  );
}
