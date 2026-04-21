import { useState } from 'react';
import { Group, Select, TextInput } from '@mantine/core';
import { IconCpu } from '@tabler/icons-react';
import { MODELS } from '../model/registry';

export type ModelSelectorProps = {
  value: string;
  downloaded: Set<string>;
  onChange: (id: string) => void;
};

export function ModelSelector({ value, downloaded, onChange }: ModelSelectorProps) {
  const [custom, setCustom] = useState('');

  const data = MODELS.map((m) => ({
    value: m.id,
    label: `${m.label} · ${m.sizeGB} GB${downloaded.has(m.id) ? ' · cached' : ''}`,
  }));
  const inList = MODELS.some((m) => m.id === value);
  if (!inList && value) {
    data.push({ value, label: `Custom: ${value}` });
  }

  return (
    <Group gap="xs" wrap="nowrap">
      <Select
        data={data}
        value={value}
        onChange={(v) => v && onChange(v)}
        leftSection={<IconCpu size={14} />}
        allowDeselect={false}
        searchable={false}
        w={260}
        size="xs"
      />
      <TextInput
        value={custom}
        onChange={(e) => setCustom(e.currentTarget.value)}
        placeholder="Custom onnx-community/… (Enter)"
        w={220}
        size="xs"
        styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)', fontSize: 11 } }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && custom.trim()) onChange(custom.trim());
        }}
      />
    </Group>
  );
}
