'use client';

import {
  MantineProvider,
  createTheme,
  localStorageColorSchemeManager,
  type MantineColorsTuple,
} from '@mantine/core';
import { DialogProvider } from '../src/ui/dialogs';

const neon: MantineColorsTuple = [
  '#f6ffd6',
  '#ecff9e',
  '#dcff55',
  '#ccff00',
  '#c2f300',
  '#b9e600',
  '#a8d200',
  '#8fb600',
  '#759300',
  '#566c00',
];

const theme = createTheme({
  primaryColor: 'neon',
  primaryShade: { light: 5, dark: 3 },
  colors: { neon },
  autoContrast: true,
  fontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontFamilyMonospace:
    '"SF Mono", "JetBrains Mono", "Cascadia Code", ui-monospace, monospace',
  defaultRadius: 'md',
});

const colorSchemeManager = localStorageColorSchemeManager({
  key: 'spaceforge:color-scheme',
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider
      theme={theme}
      defaultColorScheme="dark"
      colorSchemeManager={colorSchemeManager}
    >
      <DialogProvider>{children}</DialogProvider>
    </MantineProvider>
  );
}
