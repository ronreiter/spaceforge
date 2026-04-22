import {
  Stack,
  Card,
  Group,
  Text,
  Badge,
  Button,
  ScrollArea,
  Box,
} from '@mantine/core';
import { IconCheck, IconSparkles } from '@tabler/icons-react';
import { TEMPLATES, CUSTOM_TEMPLATE_ID, type TemplateBundle } from '../templates/registry';

export type TemplatesProps = {
  templateId: string;
  onSelect: (id: string) => void;
};

export function Templates({ templateId, onSelect }: TemplatesProps) {
  return (
    <ScrollArea h="100%" p="md">
      <Stack gap="md" maw={720} mx="auto">
        <Box>
          <Text fw={600} size="lg">
            Template
          </Text>
          <Text c="dimmed" size="sm">
            Choose how the site's layout and styles are produced. Pre-existing templates
            override the model's generated layout, header, footer, and styles.
          </Text>
        </Box>

        {TEMPLATES.map((t) => (
          <TemplateCard
            key={t.id}
            template={t}
            active={t.id === templateId}
            onSelect={onSelect}
          />
        ))}

        {TEMPLATES.length === 1 && (
          <Card withBorder p="md" style={{ borderStyle: 'dashed' }}>
            <Group gap="xs">
              <IconSparkles size={16} color="var(--mantine-color-dimmed)" />
              <Text c="dimmed" size="sm">
                More templates coming soon.
              </Text>
            </Group>
          </Card>
        )}
      </Stack>
    </ScrollArea>
  );
}

function TemplateCard({
  template,
  active,
  onSelect,
}: {
  template: TemplateBundle;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const isCustom = template.id === CUSTOM_TEMPLATE_ID;
  return (
    <Card
      withBorder
      p="md"
      style={{
        borderColor: active ? 'var(--mantine-color-neon-5)' : undefined,
        borderWidth: active ? 2 : 1,
      }}
    >
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs">
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
          <Text c="dimmed" size="sm">
            {template.description}
          </Text>
          {!isCustom && (
            <Text c="dimmed" size="xs">
              Owns: {Object.keys(template.files).sort().join(', ')}
            </Text>
          )}
        </Stack>
        <Button
          size="xs"
          variant={active ? 'light' : 'filled'}
          color="neon"
          disabled={active}
          onClick={() => onSelect(template.id)}
        >
          {active ? 'Selected' : 'Use this template'}
        </Button>
      </Group>
    </Card>
  );
}
