import { Select } from '@mantine/core';
import { IconCpu } from '@tabler/icons-react';
import { MODELS } from '../model/registry';

export type ModelSelectorProps = {
  value: string;
  downloaded: Set<string>;
  onChange: (id: string) => void;
};

type SelectItem = { value: string; label: string };
type SelectGroup = { group: string; items: SelectItem[] };

export function ModelSelector({ value, downloaded, onChange }: ModelSelectorProps) {
  const groups = new Map<string, SelectItem[]>();
  for (const m of MODELS) {
    const label = `${m.label} · ${m.sizeGB} GB${
      downloaded.has(m.id) ? ' · cached' : ''
    }`;
    const items = groups.get(m.group) ?? [];
    items.push({ value: m.id, label });
    groups.set(m.group, items);
  }
  const data: SelectGroup[] = Array.from(groups, ([group, items]) => ({
    group,
    items,
  }));

  return (
    <Select
      data={data}
      value={value}
      onChange={(v) => v && onChange(v)}
      leftSection={<IconCpu size={14} />}
      allowDeselect={false}
      searchable={false}
      w={300}
      size="xs"
    />
  );
}
